import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  AnnotatedPrediction,
  MediaPipeFaceMesh,
} from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import Sidebar from "../../components/Sidebar/Sidebar";

function Main() {
  const NUM_KEYPOINTS = 468;
  const NUM_IRIS_KEYPOINTS = 5;
  const GREEN = "#32EEDB";
  const RED = "#FF2C35";
  const roundTime = 32 * 1000;
  const MAX_FACES = 1;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blenshapeVideoRef = useRef<HTMLVideoElement>(null);
  const [inputVideo, setInputVideo] = useState("");
  const [model, setModel] = useState<MediaPipeFaceMesh>();
  const [paused, setPaused] = useState(true);
  const [currentTool, setCurrentTool] = useState("✍️");

  const onPlayPauseClick: React.MouseEventHandler<HTMLButtonElement> = async (
    e
  ) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (paused) {
      await videoEl.play();
    } else {
      videoEl.pause();
    }
    setPaused((p) => !p);
  };

  // setting tensorflow to use wasm backend
  useEffect(() => {
    const setTfBackend = async () => {
      await tf.setBackend("webgl");
      const model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
        {
          maxFaces: MAX_FACES,
        }
      );
      return model;
    };

    setTfBackend().then((model) => setModel(model));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const videoEl = videoRef.current;

    if (!canvas || !videoEl || !model) return;

    const ctx = canvas.getContext("2d");
    const ratio = getPixelRatio(ctx);
    // only recompute once w/ video? takeo utside of render loop
    const width = parseFloat(
      getComputedStyle(videoEl).getPropertyValue("width").slice(0, -2)
    );
    const height = parseFloat(
      getComputedStyle(videoEl).getPropertyValue("height").slice(0, -2)
    );

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    let requestId: number;
    let predictions: AnnotatedPrediction[] = [];

    let flag = false,
      prevX = 0,
      currX = 0,
      prevY = 0,
      currY = 0,
      dot_flag = false;

    let x = RED,
      y = 2;

    let capturedPoints: number[] = [];

    let initalX = 0;
    let initalY = 0;
    let minX = 0,
      minY = 0,
      maxX = 0,
      maxY = 0;

    canvas.addEventListener("mousedown", (e) => {
      prevX = currX;
      prevY = currY;
      currX = e.clientX - canvas.offsetLeft;
      currY = e.clientY - canvas.offsetTop;

      // record inital point we clicked
      initalX = currX;
      initalY = currY;

      flag = true;
      minX = currX;
      minY = currY;

      dot_flag = true;
      if (dot_flag) {
        ctx.beginPath();
        ctx.fillStyle = x;
        ctx.fillRect(currX, currY, 2, 2);
        ctx.closePath();
        dot_flag = false;
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      if (flag) {
        prevX = currX;
        prevY = currY;
        currX = e.clientX - canvas.offsetLeft;
        currY = e.clientY - canvas.offsetTop;
        draw(ctx, prevX, prevY, currX, currY, GREEN, 3);

        if (currX < minX) minX = currX;
        if (currX > maxX) maxX = currX;
        if (currY < minY) minY = currY;
        if (currY > maxY) maxY = currY;
        const laxFactor = 2;
        if (
          currX <= initalX + laxFactor &&
          currX >= initalX - laxFactor &&
          currY <= initalY + laxFactor &&
          currY >= initalY - laxFactor
        ) {
          const prediction = predictions[0];
          const keypoints = prediction.scaledMesh as any[];
          keypoints.forEach((pt, idx) => {
            ctx.fillStyle = GREEN;
            ctx.lineWidth = 0.5;
            const x = pt[0];
            const y = pt[1];
            if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
              capturedPoints.push(idx);
              ctx.beginPath();
              ctx.arc(x, y, 2, 0, 2 * Math.PI);
              ctx.fill();
            }
          });

          console.log(minX, maxX, minY, maxY, capturedPoints);
        }
      }
    });
    canvas.addEventListener("mouseup", () => {
      flag = false;
      initalX = 0;
      initalY = 0;
      (minX = 0), (minY = 0), (maxX = 0), (maxY = 0);
    });
    canvas.addEventListener("mouseout", () => {
      initalX = 0;
      initalY = 0;
      (minX = 0), (minY = 0), (maxX = 0), (maxY = 0);
      flag = false;
    });

    const render = async () => {
      const paused = videoEl.paused;
      if (!ctx) return;

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

      // if (paused) return;
      model
        .estimateFaces({
          input: canvas,
          returnTensors: false,
          flipHorizontal: false,
          predictIrises: false,
        })
        .then((res) => {
          predictions = res;
          if (!paused) {
            requestId = requestAnimationFrame(render);
          }
        });

      // requestId = requestAnimationFrame(render);

      ctx.strokeStyle = RED;
      ctx.fillStyle = RED;
      ctx.lineWidth = 0.5;

      predictions.forEach((prediction) => {
        const keypoints = prediction.scaledMesh as any[];
        keypoints.forEach((pt, idx) => {
          // ctx.fillStyle = idx in capturedPoints ? GREEN : RED;

          const x = pt[0];
          const y = pt[1];

          ctx.beginPath();
          ctx.arc(x, y, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      });

      return () => {
        cancelAnimationFrame(requestId);
      };
    };
    render();
  }, [canvasRef, videoRef, model, paused]);

  return (
    <div className="flex w-full">
      <div className="flex flex-col w-20 h-screen px-3 pt-6 space-y-4 bg-blue-100">
        {["✍️", "👉", "❌", "➕"].map((icon, idx) => {
          return (
            <button
              onClick={() => setCurrentTool(icon)}
              className={`flex h-12 px-2 text-center text-white border border-black rounded-lg ${
                icon === currentTool ? "bg-gray-400" : ""
              }`}
            >
              <div className={`mx-auto mt-2 text-white`}>{icon}</div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col w-full p-2">
        <div className="flex w-full">
          <div className="w-1/2 bg-gray-100">
            {videoRef.current && (
              <canvas
                style={{
                  // left:
                  //   videoRef.current?.getBoundingClientRect().left +
                  //   videoRef.current?.getBoundingClientRect().width / 2 +
                  //   "px", //"25%",
                  position: "absolute",
                  height: videoRef.current?.videoHeight + "px",
                  width: videoRef.current?.videoWidth + "px",
                  //WebkitTransform: "translate3d(-50%, 0, 0) scaleX(-1)",
                  //transform: "translate3d(-50%, 0, 0) scaleX(-1)",
                }}
                className="bg-green-200"
                ref={canvasRef}
                onMouseMove={() => {}}
              />
            )}
            <video
              ref={videoRef}
              style={{
                width: "100%",
                height: "auto",
                // position: "fixed",
                //transform: "scaleX(-1)",
                // WebkitTransform: "scaleX(-1)",
                visibility: "hidden",
              }}
              id="videoElement"
              src={
                inputVideo
                  ? "allowfile:///" + inputVideo
                  : "allowfile:///" + "/home/arnav/Videos/video-1647646130.mp4"
              }
              muted={true}
              controls
            >
              should be displayed here. Please check your browser or permissions
              in order to turn on video.
            </video>
          </div>
          <div className="w-1/2 bg-gray-100">
            {canvasRef.current && (
              <video
                ref={blenshapeVideoRef}
                className="px-2 mx-auto bg-blue-200"
                style={{
                  height: canvasRef.current.height + "px",
                  width: "100%",
                }}
                src={
                  "allowfile:///" +
                  "/home/arnav/Desktop/csc2521/demo-video/metahuman.mp4"
                }
                muted={true}
                // controls
              >
                should be displayed here. Please check your browser or
                permissions in order to turn on video.
              </video>
            )}
          </div>
        </div>
        <div className="flex w-full mt-2 bg-gray-100 ">
          <input
            type="file"
            accept="video/*"
            className="w-1/2 p-2 bg-gray-200 rounded-lg cursor-pointer"
            onChange={(e) => setInputVideo(e.currentTarget.files[0].path)}
          />
          <button
            className={`w-full h-12 ${
              paused ? "bg-green-200" : "bg-yellow-200"
            } rounded-lg`}
            onClick={onPlayPauseClick}
          >
            {paused ? "Play" : "Pause"}
          </button>
          <button className={`w-64 h-12 bg-orange-200 rounded-lg`}>
            Render
          </button>
        </div>

        <div className="flex w-full h-32 p-2 mt-2 bg-gray-100 rounded-lg"></div>

        <div className="flex w-full h-32 mt-2 bg-gray-100">
          <div className="w-full p-2 bg-gray-200 border rounded-lg ">aa</div>
        </div>
      </div>
    </div>
  );
}

function draw(
  ctx: any,
  prevX: number,
  prevY: number,
  currX: number,
  currY: number,
  strokeStyle: string,
  lineWidth: number
) {
  ctx.beginPath();
  ctx.moveTo(prevX, prevY);
  ctx.lineTo(currX, currY);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.closePath();
}

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

export default Main;
