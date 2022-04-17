import { IpcRendererEvent } from "electron";
import React, { useEffect, useRef, useState } from "react";
import Canvas from "../../components/Canvas";

type PrincipalMotionType = "x" | "y" | "w";

function VideoPlayer() {
  const [inputVideo, setInputVideo] = useState("");
  const [paused, setPaused] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [selectPrincipalMotion, setSelectPrincipalMotion] = useState([]);
  const [principalMotion, setPrincipalMotion] = useState<PrincipalMotionType>();
  const pMotionRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const onPlayPauseClick: React.MouseEventHandler<
    HTMLButtonElement
  > = async () => {
    const landmarks = await (window as any).electronAPI.processLandmarks(
      inputVideo
    );
    console.log(landmarks);

    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (paused) {
      await videoEl.play();
    } else {
      videoEl.pause();
    }
    setPaused((p) => !p);
  };

  const draw = (ctx: CanvasRenderingContext2D, frameCount: number) => {
    const video = videoRef.current;
    const ratio = getPixelRatio(ctx);
    const width = parseFloat(
      getComputedStyle(video).getPropertyValue("width").slice(0, -2)
    );
    const height = parseFloat(
      getComputedStyle(video).getPropertyValue("height").slice(0, -2)
    );

    ctx.canvas.width = width * ratio;
    ctx.canvas.height = height * ratio;

    ctx.drawImage(
      video,
      0,
      0,
      video.videoWidth,
      video.videoHeight,
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height
    );
  };

  const onCanvasClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    setSelectPrincipalMotion([
      e.clientX - pMotionRef.current.offsetWidth / 2,
      e.clientY - pMotionRef.current.offsetHeight / 2,
    ]);
  };

  const onCanvasMouseUp = () => {
    setSelectPrincipalMotion([]);
  };

  return (
    <div className="bg-black">
      <div
        onClick={onCanvasClick}
        style={{
          position: "absolute",
        }}
        className="z-10"
      >
        <Canvas draw={draw} />
      </div>

      {selectPrincipalMotion && (
        <div
          style={{
            left: selectPrincipalMotion[0],
            top: selectPrincipalMotion[1],
            visibility:
              selectPrincipalMotion.length === 0 ? "hidden" : "visible",
          }}
          onClick={onCanvasMouseUp}
          ref={pMotionRef}
          className={`absolute flex flex-wrap z-20 w-24 h-24 bg-gray-200 rounded-full cursor:pointer`}
        >
          {["x", "y", "w"].map((el) => (
            <div className="w-12 h-12 bg-red-200 hover:bg-red-400">{el} </div>
          ))}
        </div>
      )}

      <video
        onLoadedMetadata={() => setIsVideoReady(true)}
        ref={videoRef}
        style={{
          width: "auto",
          maxWidth: "100%",
          maxHeight: "400px",
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
        should be displayed here. Please check your browser or permissions in
        order to turn on video.
      </video>
      <div className="flex w-full mt-2 bg-gray-100 ">
        <input
          type="file"
          accept="video/*"
          className="w-full p-2 bg-gray-200 rounded-lg cursor-pointer"
          onChange={(e) => setInputVideo(e.currentTarget.files[0].path)}
        />
        <button
          className={`h-12 w-20 text-2xl ${
            paused ? "bg-green-200" : "bg-yellow-100"
          } rounded-lg`}
          onClick={onPlayPauseClick}
        >
          {paused ? "▶️" : "⏸"}
        </button>
      </div>
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

export default VideoPlayer;
