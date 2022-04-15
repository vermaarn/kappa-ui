import React, { useEffect, useRef, useState } from "react";
import Canvas from "../../components/Canvas";

function VideoPlayer() {
  const [inputVideo, setInputVideo] = useState("");
  const [paused, setPaused] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [context, setContext] = React.useState<CanvasRenderingContext2D | null>(
    null
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onPlayPauseClick: React.MouseEventHandler<
    HTMLButtonElement
  > = async () => {
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

  return (
    <div className="bg-gray-100">
      <div style={{ position: "absolute" }}>
        <Canvas draw={draw} />
      </div>
      <video
        onLoadedMetadata={() => setIsVideoReady(true)}
        ref={videoRef}
        style={{
          width: "100%",
          height: "auto",
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
