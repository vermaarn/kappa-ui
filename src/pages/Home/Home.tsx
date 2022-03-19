import React from "react";
import * as tf from "@tensorflow/tfjs";
import { useEffect, useRef, useState } from "react";

import {
  AnnotatedPrediction,
  MediaPipeFaceMesh,
} from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import "@tensorflow/tfjs-backend-webgl";
import localforage from "localforage";

import { findEyeBox, trainEyeBoxTensor } from "./eyeBoxTraining";
import { distance } from "./eyeVector";
interface IDataTensor {
  labelVector: tf.Tensor<tf.Rank>[];
  trainVector: tf.Tensor<tf.Rank>[];
}

function Home() {
  const NUM_KEYPOINTS = 468;
  const NUM_IRIS_KEYPOINTS = 5;
  const GREEN = "#32EEDB";
  const RED = "#FF2C35";
  const roundTime = 32 * 1000;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eyeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<MediaPipeFaceMesh>();

 

  // setting tensorflow to use wasm backend
  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    // set up tensorflow backend
    const setTfBackend = async (videoEl: HTMLVideoElement) => {
      // tfjsWasm.setWasmPaths(
      //   `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`
      // );
      await tf.setBackend("webgl");
      await setupCamera(videoEl);
      const model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
        {
          maxFaces: 1,
        }
      );
      return model;
    };

    // set up video and the interval of frames
    // on when to predict in the video.
    const setupVideo = async (videoEl: HTMLVideoElement) => {
      await setupCamera(videoEl);
      const model = await setTfBackend(videoEl);
      setModel(model);
    };
    try {
      setupVideo(videoRef.current);
    } catch (err) {
      console.log(err);
    }
  }, [videoRef]);

  // get value to center of stim location
  // draw small dot on stim
  const [expectedStimX, setExpectedStimX] = useState(0);
  const [expectedStimY, setExpectedStimY] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      const stim = document.querySelector<HTMLDivElement>("#striped-cir");
      if (stim) {
        const stimBound = stim.getBoundingClientRect();
        const currX = stimBound.x + stimBound.width / 2;
        const currY = stimBound.y + stimBound.height / 2;
        // console.log(currX, currY);
        setExpectedStimX(currX);
        setExpectedStimY(currY);
      }
    }, 1);

    return () => {
      clearInterval(id);
    };
  }, []);

   const getPixelRatio = (context: any) => {
    const backingStore =
      context.backingStorePixelRatio ||
      context.webkitBackingStorePixelRatio ||
      context.mozBackingStorePixelRatio ||
      context.msBackingStorePixelRatio ||
      context.oBackingStorePixelRatio ||
      context.backingStorePixelRatio ||
      1;

    return (window.devicePixelRatio || 1) / backingStore;
  };
  
  // paint camera frames and cnn on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const eyeCanvas = eyeCanvasRef.current;
    const videoEl = videoRef.current;

    if (!videoEl || !model || !canvas || !eyeCanvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    const eyeCtx = eyeCanvas.getContext("2d");

    const ratio = getPixelRatio(ctx);
    const width = parseFloat(
      getComputedStyle(canvas).getPropertyValue("width").slice(0, -2)
    );
    const height = parseFloat(
      getComputedStyle(canvas).getPropertyValue("height").slice(0, -2)
    );

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const eyeRatio = getPixelRatio(eyeCtx);
    const eWidth = parseFloat(
      getComputedStyle(eyeCanvas).getPropertyValue("width").slice(0, -2)
    );
    const eHeight = parseFloat(
      getComputedStyle(eyeCanvas).getPropertyValue("height").slice(0, -2)
    );
    eyeCanvas.width = eWidth * eyeRatio;
    eyeCanvas.height = eHeight * eyeRatio;
    eyeCanvas.style.width = `${eWidth}px`;
    eyeCanvas.style.height = `${eHeight}px`;

    let requestId: number;
    let predictions: AnnotatedPrediction[] = [];

    const render = async () => {
      if (!ctx || !eyeCtx) return;

      ctx.drawImage(
        videoEl,
        0,
        0,
        videoEl.videoWidth,
        videoEl.videoHeight,
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height
      );

      model
        .estimateFaces({
          input: videoEl,
          returnTensors: false,
          flipHorizontal: false,
          predictIrises: true,
        })
        .then((res) => {
          predictions = res;
          requestId = requestAnimationFrame(render);
        });

      // https://github1s.com/tensorflow/tfjs-models/blob/master/face-landmarks-detection/demo/index.js
      predictions.forEach((prediction) => {
        const eyesRect = findEyeBox(prediction);
        ctx.beginPath();
        ctx.strokeStyle = RED;
        ctx.strokeRect(eyesRect[0], eyesRect[1], eyesRect[2], eyesRect[3]);
        ctx.stroke();

        const keypoints = prediction.scaledMesh as any;
        ctx.fillStyle = GREEN;
        const { leftEyeUpper0, leftEyeLower0, rightEyeLower0, rightEyeUpper0 } =
          (prediction as any).annotations;
        [leftEyeUpper0, leftEyeLower0, rightEyeLower0, rightEyeUpper0].forEach(
          (section) => {
            section.forEach((val: number[], idx: number) => {
              const x = val[0];
              const y = val[1];
              ctx.beginPath();
              ctx.arc(x, y, 1, 0, 2 * Math.PI);
              ctx.fill();
            });
          }
        );

        if (keypoints.length > NUM_KEYPOINTS) {
          ctx.strokeStyle = RED;
          ctx.fillStyle = RED;

          ctx.lineWidth = 0.5;
          const leftCenter = keypoints[NUM_KEYPOINTS];
          ctx.beginPath();
          ctx.arc(leftCenter[0], leftCenter[1], 1, 0, 2 * Math.PI);
          ctx.fill();

          const leftDiameterY = distance(
            keypoints[NUM_KEYPOINTS + 4],
            keypoints[NUM_KEYPOINTS + 2]
          );
          const leftDiameterX = distance(
            keypoints[NUM_KEYPOINTS + 3],
            keypoints[NUM_KEYPOINTS + 1]
          );
          ctx.beginPath();
          ctx.ellipse(
            leftCenter[0],
            leftCenter[1],
            leftDiameterX / 2,
            leftDiameterY / 2,
            0,
            0,
            2 * Math.PI
          );

          ctx.stroke();
          if (keypoints.length > NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS) {
            const rightCenter = keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS];
            ctx.beginPath();
            ctx.arc(rightCenter[0], rightCenter[1], 1, 0, 2 * Math.PI);
            ctx.fill();
            const rightDiameterY = distance(
              keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 2],
              keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 4]
            );
            const rightDiameterX = distance(
              keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 3],
              keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 1]
            );
            ctx.beginPath();

            ctx.ellipse(
              rightCenter[0],
              rightCenter[1],
              rightDiameterX / 2,
              rightDiameterY / 2,
              0,
              0,
              2 * Math.PI
            );
            ctx.stroke();
          }
        }
        // add cropped eyes to canvas
        const resizeFactorX = videoEl.videoWidth / canvas.width;
        const resizeFactorY = videoEl.videoHeight / canvas.height;

        eyeCtx.drawImage(
          canvas,
          eyesRect[0] * resizeFactorX,
          eyesRect[1] * resizeFactorY,
          eyesRect[2] * resizeFactorX,
          eyesRect[3] * resizeFactorY,
          0,
          0,
          eyeCanvas.width,
          eyeCanvas.height
        );
      });
    };
    render();

    return () => {
      cancelAnimationFrame(requestId);
    };
  }, [canvasRef, eyeCanvasRef, videoRef, model]);

  const [predictedStimX, setPredictedStimX] = useState(0);
  const [predictedStimY, setPredictedStimY] = useState(0);
  const [trainVector, setTrainVector] = useState<any[]>([]);
  const [labelVector, setLabelVector] = useState<any[]>([]);
  const [valTrainVector, setValTrainVector] = useState<any[]>([]);
  const [valLabelVector, setValLabelVector] = useState<any[]>([]);
  const [elapsedTime, setElapesedTime] = useState<number>(0);

  //predicted stim locations
  useEffect(() => {
    const samplingRateMS = 1000; // sampling rate in milliseconds

    const id = setInterval(async () => {
      const stimEl = document.querySelector<HTMLDivElement>("#striped-cir");
      const videoEl = videoRef.current;
      const eyeCanvasEl = eyeCanvasRef.current;
      if (!stimEl || !model || !videoEl || !eyeCanvasEl) {
        return;
      }

      function getImage() {
        // Capture the current image in the eyes canvas as a tensor.
        return tf.tidy(function () {
          if (!eyeCanvasEl) return;
          const image = tf.browser.fromPixels(eyeCanvasEl);
          // Add a batch dimension:
          const batchedImage = image.expandDims(0);
          // Normalize and return it:
          return batchedImage.toFloat().div(tf.scalar(127)).sub(tf.scalar(1));
        });
      }
      const stimBound = stimEl.getBoundingClientRect();
      const currX = stimBound.x + stimBound.width / 2;
      const currY = stimBound.y + stimBound.height / 2;
      const currXNorm = (currX / window.innerWidth) * 2 - 1;
      const currYNorm = (currY / window.innerHeight) * 2 - 1;
      tf.tidy(function () {
        const stimPos = tf.tensor1d([currXNorm, currYNorm]).expandDims(0);
        const vectorType = Math.random() > 0.2 ? "train" : "val";
        const image = getImage();
        if (image) {
          const x = image.arraySync() as number[][][][][];
          const y = stimPos.arraySync() as number[][][];
          // console.log(x[0], y[0]);
          if (vectorType === "train") {
            setTrainVector((arr) => [...arr, x[0]]);
            setLabelVector((arr) => [...arr, y[0]]);
          } else if (vectorType === "val") {
            setValTrainVector((arr) => [...arr, x[0]]);
            setValLabelVector((arr) => [...arr, y[0]]);
          }

          setElapesedTime((t) => t + samplingRateMS);
        }
      });
    }, samplingRateMS);

    return () => {
      clearInterval(id);
    };
  }, [model, videoRef, eyeCanvasRef]);

  // add vector to storage
  useEffect(() => {
    if (elapsedTime % roundTime === 0) {
      const recordRound = Math.floor(elapsedTime / roundTime);
      // console.log(recordRound);
      localforage
        .setItem(`eyegaze-r${recordRound}`, {
          labelVector,
          trainVector,
        })
        .then(() => {
          setLabelVector([]);
          setTrainVector([]);
        });
      localforage
        .setItem(`eyegaze-r${recordRound}-val`, {
          labelVector: valLabelVector,
          trainVector: valTrainVector,
        })
        .then(() => {
          setValLabelVector([]);
          setValTrainVector([]);
        });
    }
    // eslint-disable-next-line
  }, [elapsedTime, roundTime]);

  const [isRecording, setIsRecording] = useState(true);
  useEffect(() => {
    const FINAL_TRAIN_ROUND = 1;
    if (Math.floor(elapsedTime / roundTime) === FINAL_TRAIN_ROUND) {
      setIsRecording(false);
    }
  }, [elapsedTime, roundTime]);

  // train the vector after all rounds have completed
  const [isCompletedTraining, setIsCompletedTraining] = useState(false);
  useEffect(() => {
    const startTraining = async () => {
      const round0 = await localforage.getItem<IDataTensor>(`eyegaze-r0`);
      const round1 = await localforage.getItem<IDataTensor>("eyegaze-r1");
      // const round2 = await localforage.getItem<IDataTensor>("eyegaze-r2");
      // const round3 = await localforage.getItem<IDataTensor>("eyegaze-r1");

      const round0Val = await localforage.getItem<IDataTensor>(
        "eyegaze-r0-val"
      );
      const round1Val = await localforage.getItem<IDataTensor>(
        "eyegaze-r1-val"
      );

      console.log(round0, round1, round0Val, round1Val);
      if (!eyeCanvasRef.current) return;
      const eyeBoxShape = [
        eyeCanvasRef.current.height,
        eyeCanvasRef.current.width,
        3,
      ];
      if (
        round0 &&
        round1 /* &&  round2 && round3 */ &&
        round0Val &&
        round1Val
      ) {
        const labelTensor = round0.labelVector.concat(round1.labelVector);

        // .concat(round2.labelVector)
        // .concat(round3.labelVector);
        const trainTensor = round0.trainVector.concat(round1.trainVector);

        // .concat(round2.trainVector)
        // .concat(round3.trainVector);

        const labelValTensor = round0Val.labelVector.concat(
          round1Val.labelVector
        );
        const trainValTensor = round0Val.trainVector.concat(
          round1Val.trainVector
        );

        const datasetArr = {
          train: {
            n: labelTensor.length,
            x: trainTensor as any,
            y: labelTensor,
          },
          val: {
            n: labelValTensor.length,
            x: trainValTensor as any,
            y: labelValTensor,
          },
        };

        // await trainEyeBoxTensor(datasetArr, true, eyeBoxShape);
        // setIsCompletedTraining(true);
      }
    };

    if (!isRecording) {
      startTraining();
    }
  }, [isRecording]);

  // start predicting the vector after all rounds have completed
  useEffect(() => {
    const eyeCanvasEl = eyeCanvasRef.current;
    if (!isCompletedTraining || !model || !videoRef.current || !eyeCanvasEl)
      return;

    const predict = async () => {
      if (!isCompletedTraining || !model || !videoRef.current) return;
      function getImage() {
        // Capture the current image in the eyes canvas as a tensor.
        return tf.tidy(function () {
          if (!eyeCanvasEl) return;
          const image = tf.browser.fromPixels(eyeCanvasEl);
          // Add a batch dimension:
          const batchedImage = image.expandDims(0);
          // Normalize and return it:
          return batchedImage.toFloat().div(tf.scalar(127)).sub(tf.scalar(1));
        });
      }

      tf.tidy(() => {
        const image = getImage();
        if (!image) return;
        const imageArr = image.arraySync() as number[][][][][];
        const datasetArr = {
          train: {
            n: 1,
            x: imageArr,
            y: [[0, 0]],
          },
        };
        const eyeBoxShape = [eyeCanvasEl.height, eyeCanvasEl.width, 3];
        trainEyeBoxTensor(datasetArr, false, eyeBoxShape).then((prediction) => {
          const x = ((prediction[0] + 1) / 2) * (window.innerWidth - 10);
          const y = ((prediction[1] + 1) / 2) * (window.innerHeight - 10);

          setPredictedStimX(x);
          setPredictedStimY(y);
        });
      });
    };
    setInterval(predict, 100);
  }, [isCompletedTraining, videoRef, model, eyeCanvasRef]);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !eyeCanvasRef.current)
      return;
    // eyeTrackMain();
  }, [videoRef, canvasRef, eyeCanvasRef]);

  return (
    <div style={{ display: "inline-block", verticalAlign: "top" }}>
      asdsad
      {/* <canvas
        style={{
          left: "50%",
          position: "absolute",
          height: videoRef.current?.videoHeight + "px",
          width: videoRef.current?.videoWidth + "px",
          WebkitTransform: "translate3d(-50%, 0, 0) scaleX(-1)",
          transform: "translate3d(-50%, 0, 0) scaleX(-1)",
        }}
        ref={canvasRef}
      />
      <canvas
        style={{
          width: "200px",
          height: "50px",
          position: "absolute",
        }}
        id="eyes-canvas"
        ref={eyeCanvasRef}
      />
      <video
        ref={videoRef}
        style={{
          width: "auto",
          height: "auto",
          transform: "scaleX(-1)",
          WebkitTransform: "scaleX(-1)",
          visibility: "hidden",
        }}
        autoPlay={true}
        id="videoElement"
      >
        A video should be displayed here. Please check your browser or
        permissions in order to turn on video.
      </video>

      <div
        id="expected-stim"
        style={{
          position: "fixed",
          height: 10 + "px",
          width: 10 + "px",
          left: expectedStimX - 5 + "px",
          top: expectedStimY - 5 + "px",
        }}
        className="z-30 w-6 h-6 bg-purple-600 rounded-full"
      />
      <div
        id="predicted-stim"
        style={{
          position: "fixed",
          height: 10 + "px",
          width: 10 + "px",
          left: predictedStimX - 5 + "px",
          top: predictedStimY - 5 + "px",
          transition: "all 0.1s ease",
        }}
        className="z-30 w-6 h-6 bg-yellow-800 rounded-full bg-"
      /> */}
      asdsadas
      {/* <div className="absolute w-full h-full">{<CalibrationStudy />}</div> */}
    </div>
  );
}

async function setupCamera(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true,
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

export default Home;
