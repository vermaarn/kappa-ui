import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  AnnotatedPrediction,
  MediaPipeFaceMesh,
} from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";

function Main() {
  const NUM_KEYPOINTS = 468;
  const NUM_IRIS_KEYPOINTS = 5;
  const GREEN = "#32EEDB";
  const RED = "#FF2C35";
  const roundTime = 32 * 1000;
  const MAX_FACES = 1;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputVideo, setInputVideo] = useState("");
  const [model, setModel] = useState<MediaPipeFaceMesh>();
  const [paused, setPaused] = useState(true);

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
    const render = async () => {
      if (!ctx || paused) return;

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
          predictIrises: false,
        })
        .then((res) => {
          predictions = res;
          requestId = requestAnimationFrame(render);
        });

      // requestId = requestAnimationFrame(render);

      ctx.strokeStyle = RED;
      ctx.fillStyle = RED;
      ctx.lineWidth = 0.5;
      // https://github1s.com/tensorflow/tfjs-models/blob/master/face-landmarks-detection/demo/index.js
      predictions.forEach((prediction) => {
        const keypoints = prediction.scaledMesh as any[];
        keypoints.forEach((pt) => {
          const x = pt[0];
          const y = pt[1];
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, 2 * Math.PI);
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
    <div>
      <canvas
        style={{
          left: "50%",
          position: "absolute",
          height: videoRef.current?.videoHeight + "px",
          width: videoRef.current?.videoWidth + "px",
          WebkitTransform: "translate3d(-50%, 0, 0) scaleX(-1)",
          transform: "translate3d(-50%, 0, 0) scaleX(-1)",
        }}
        className="bg-green-200"
        ref={canvasRef}
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
        id="videoElement"
        src={"allowfile:///" + "/home/arnav/Videos/video-1647646130.mp4"}
        muted={true}
        controls
      >
        should be displayed here. Please check your browser or permissions in
        order to turn on video.
      </video>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setInputVideo(e.currentTarget.files[0].path)}
      />
      <button
        className={`w-full h-12 ${
          paused ? "bg-green-200" : "bg-yellow-200"
        } rounded-full`}
        onClick={onPlayPauseClick}
      >
        {paused ? "Play" : "Pause"}
      </button>
    </div>
  );
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
