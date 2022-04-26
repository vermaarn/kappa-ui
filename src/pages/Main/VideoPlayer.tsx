import { IpcRendererEvent } from "electron";
import React, { useEffect, useRef, useState } from "react";
import Canvas from "../../components/Canvas";
import { VscPlay, VscDebugPause } from "react-icons/vsc"

type PrincipalMotionType = "x" | "y" | "w";

const principalMotions: PrincipalMotionType[] = ["x", "y", "w"]
function VideoPlayer() {
  const [inputVideo, setInputVideo] = useState("");
  const [paused, setPaused] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [selectPrincipalMotion, setSelectPrincipalMotion] = useState([]);
  const [principalMotion, setPrincipalMotion] = useState<PrincipalMotionType>("x");
  const pMotionRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const onPlayPauseClick: React.MouseEventHandler<
    HTMLButtonElement
  > = async () => {
    const landmarks = await (window as any).electronAPI.processLandmarks(
      "1"
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

  const onPrincipalMotionClick = (pm: PrincipalMotionType) => {
    setPrincipalMotion(pm)
  }

  return (
    <div className="">
      <div className="px-auto wll">
        <div
          onClick={onCanvasClick}
          style={{
            position: "absolute",
          }}
          className="z-10 mx-auto"
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
            {principalMotions.map((el, idx) => (
              <div style={{
                borderTopLeftRadius: idx === 0 ? "100%" : "0",
                borderTopRightRadius: idx === 1 ? "100%" : "0",
                borderBottomLeftRadius: idx === 2 ? "100%" : "0"
              }}
                onClick={() => onPrincipalMotionClick(el)}
                className={`content-center w-12 h-12 pt-2 text-xl text-center  cursor-pointer justify-self-center ${el === principalMotion ? "bg-red-400" : "bg-red-200 hover:bg-red-300"}`}>{el} </div>
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
      </div>
      <div className="flex w-full h-8 bg-gray-100 ">
        <button
          className={`text-2xl ml-1 h-4 w-4 text-center mt-1`}
          onClick={onPlayPauseClick}
        >
          {paused ? <VscPlay /> : <VscDebugPause />}
        </button>
        <div className="w-full p-1 ml-2 bg-gray-200">
          <div className="w-1/2 h-full bg-blue-300" />
        </div>
        <input
          type="file"
          accept="video/*"
          className="w-8 px-1 cursor-pointer"
          onChange={(e) => setInputVideo(e.currentTarget.files[0].path)}
        />

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
