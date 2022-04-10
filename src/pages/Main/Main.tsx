import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FaceMesh,
  FACEMESH_TESSELATION,
  NormalizedLandmark,
  NormalizedLandmarkList,
  Options,
  ResultsListener,
} from "@mediapipe/face_mesh";

import "./timeline.css";

import { drawConnectors } from "@mediapipe/drawing_utils";
import markers from "./custom_markers.json";

import {
  AnnotatedPrediction,
  MediaPipeFaceMesh,
} from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
import "@tensorflow/tfjs-backend-webgl";
import { Timeline, DataSet, TimelineOptions } from "vis-timeline/standalone";

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
  const [paused, setPaused] = useState(true);
  const [currentTool, setCurrentTool] = useState("✍️");
  const [facemeshModel, setFacemeshModel] = useState<FaceMesh>();
  const videoTimelineRef = useRef<HTMLDivElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const onRenderClick = useCallback(() => {
    // {
    //   "nose": [ {0,60, neutral pose}, {30, 60, nueral} ],
    // },
  }, []);

  useEffect(() => {
    const container = videoTimelineRef.current;
    const video = videoRef.current;
    if (!container || !video || !isVideoReady) return;

    // create a DataSet with items
    const items = new DataSet([
      {
        id: 1,
        content: "Editable",
        editable: true,
        start: 0,
        end: 23,
        group: 1,
      },
      {
        id: 2,
        content: "Editable",
        editable: true,
        start: 23,
        end: 27,
        group: 2,
      },
      {
        id: 3,
        content: "Timeline",
        editable: false,
        start: 10,
        end: 30,
        group: 2,
        color: "#0f0f0f",
      },
    ]);

    const groups = new DataSet(
      ["nose", "l_brow", "r_brow", "l_eye", "r_eye", "i_lips", "o_lips"].map(
        (name, idx) => ({ id: idx, content: name, value: idx + 1 })
      )
    );

    const options: TimelineOptions = {
      min: 0,
      max: video.duration,
      multiselect: true,
      editable: {
        add: true,
        remove: true,
        updateGroup: false,
        updateTime: true,
        overrideItems: false,
      },
    };

    const timeline = new Timeline(container, items, groups, options);
    timeline.setWindow(0, video.duration, { animation: false });
    const currVideoTimeId = timeline.addCustomTime(0);
    video.addEventListener("timeupdate", (e) => {
      if (!video.paused) {
        const time = e.timeStamp / 1000;
        timeline.setCustomTime(time, currVideoTimeId);
      }
    });
    // timeline.on("timechange", (e) => {
    //   video.currentTime = e.time.getTime()
    // });

    // const updateEditOptions = function (e: any) {
    //   const changedOption: any = e.target.name;
    //   const options: any = { editable: {} };
    //   options.editable[changedOption] = e.target.checked;
    //   timeline.setOptions(options);
    // };

    // const cbs = document.getElementsByTagName("input");
    // [].forEach.call(cbs, (cb: any) => {
    //   cb.onchange = updateEditOptions;
    // });
  }, [videoTimelineRef, videoRef, isVideoReady]);

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
    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });
    const options: Options = {
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    faceMesh.setOptions(options);
    setFacemeshModel(faceMesh);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const videoEl = videoRef.current;

    if (!canvas || !videoEl || !facemeshModel) return;

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

    const grouped_marker: { [key: string]: number[] } = {
      nose: markers.nose.tip.concat(markers.nose.dorsum),
      l_brow: markers.brow.leftUpper.concat(markers.brow.leftLower),
      r_brow: markers.brow.rightUpper.concat(markers.brow.rightLower),
      l_eye: markers.eye.left,
      r_eye: markers.eye.right,
      i_lips: markers.lips.inner,
      o_lips: markers.lips.outer,
      anchors: markers.additional_anchors,
    };

    const { nose, l_brow, r_brow, l_eye, r_eye, i_lips, o_lips, anchors } =
      grouped_marker;

    let selectedMarkers: { [name: string]: boolean } = {
      nose: false,
      l_brow: false,
      r_brow: false,
      l_eye: false,
      r_eye: false,
      i_lips: false,
      o_lips: false,
    };

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
          // const prediction = predictions[0];
          const keypoints = predArr[0];
          keypoints.forEach((pt, idx) => {
            ctx.fillStyle = GREEN;
            ctx.lineWidth = 0.5;
            const x = pt.x * ctx.canvas.width;
            const y = pt.y * ctx.canvas.height;

            if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
              capturedPoints.push(idx);
              // ctx.beginPath();
              // ctx.arc(x, y, 2, 0, 2 * Math.PI);
              // ctx.fill();
            }
          });

          for (const label in grouped_marker) {
            capturedPoints.forEach((ptIdx) => {
              if (grouped_marker[label].includes(ptIdx)) {
                selectedMarkers[label] = true;
              }
            });
            if (selectedMarkers[label]) {
              grouped_marker[label].forEach((ptIdx) => {
                ctx.fillStyle = GREEN;
                ctx.lineWidth = 0.5;
                const pt = keypoints[ptIdx];
                const x = pt.x * ctx.canvas.width;
                const y = pt.y * ctx.canvas.height;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
                ctx.fill();
              });
            }
          }

          // capturedPoints.forEach((idx) => {
          //   for ()
          // })

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

    let predArr: NormalizedLandmarkList[] = [];
    const resultListener: ResultsListener = (res) => {
      if (!paused) {
        console.log("SS", selectedMarkers);
        predArr = res.multiFaceLandmarks as NormalizedLandmarkList[];
        requestId = requestAnimationFrame(render);
      }
    };

    facemeshModel.onResults(resultListener);

    const paintModelPt = (
      groupLabel: string,
      landmarks: NormalizedLandmarkList,
      color: string
    ) => {
      grouped_marker[groupLabel].forEach((ptIdx) => {
        const pt = landmarks[ptIdx];
        const x = pt.x * ctx.canvas.width;
        const y = pt.y * ctx.canvas.height;

        // if mouse is around the point
        ctx.fillStyle = color;
        ctx.lineWidth = 2;

        // const laxFactor = 1;
        // if (
        //   currX <= x + laxFactor &&
        //   currX >= x - laxFactor &&
        //   currY <= y + laxFactor &&
        //   currY >= y - laxFactor
        // ) {
        //   ctx.fillStyle = GREEN;
        // }

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
    };

    const render = async () => {
      if (!ctx) return;
      ctx.save();

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

      await facemeshModel.send({ image: canvas });

      ctx.strokeStyle = RED;
      ctx.fillStyle = RED;
      ctx.lineWidth = 0.5;

      predArr.forEach((landmarks) => {
        drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, {
          color: "#C0C0C070",
          lineWidth: 0.5,
        });

        for (const key in grouped_marker) {
          // console.log(selectedMarkers, selectedMarkers[key]);
          if (selectedMarkers[key]) {
            paintModelPt(key, landmarks, GREEN);
          } else {
            paintModelPt(key, landmarks, RED);
          }
        }

        // nose.forEach((ptIdx) =>   paintModelPt(landmarks[ptIdx], "#d13c4b"));
        // l_brow.forEach((ptIdx) => paintModelPt(landmarks[ptIdx], "#c0267e"));
        // r_brow.forEach((ptIdx) => paintModelPt(landmarks[ptIdx], "#4f9125"));
        // l_eye.forEach((ptIdx) =>  paintModelPt(landmarks[ptIdx], "#8d0179"));
        // r_eye.forEach((ptIdx) =>  paintModelPt(landmarks[ptIdx], "#f98faf"));
        // i_lips.forEach((ptIdx) => paintModelPt(landmarks[ptIdx], RED));
        // o_lips.forEach((ptIdx) => paintModelPt(landmarks[ptIdx], RED));
        // anchors.forEach((ptIdx) => paintModelPt(landmarks[ptIdx], "#4288b5"));
      });

      ctx.restore();

      return () => {
        cancelAnimationFrame(requestId);
      };
    };
    render();
  }, [canvasRef, videoRef, facemeshModel, paused]);

  return (
    <div className="flex w-full">
      <div className="flex flex-col w-full p-2">
        <div className="flex w-full">
          <div className="flex flex-col w-20 h-full px-3 pt-6 space-y-4 bg-blue-100">
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
          <div className="w-1/2 bg-gray-100">
            {videoRef.current && (
              <canvas
                style={{
                  position: "absolute",
                  height: videoRef.current?.videoHeight + "px",
                  width: videoRef.current?.videoWidth + "px",
                }}
                className="bg-green-200"
                ref={canvasRef}
                onMouseMove={() => {}}
              />
            )}
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
              should be displayed here. Please check your browser or permissions
              in order to turn on video.
            </video>
          </div>
          <div className="flex flex-col w-16 h-full px-1 pt-6 space-y-2 bg-gray-300">
            {["✍️", "👉", "❌", "➕"].map((icon, idx) => {
              return (
                <button
                  onClick={() => setCurrentTool(icon)}
                  className={`flex h-12 px-2 w-full text-center text-white border border-black rounded-lg ${
                    icon === currentTool ? "bg-gray-400" : ""
                  }`}
                >
                  <div className={`mx-auto mt-2 text-white`}>{icon}</div>
                </button>
              );
            })}
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

        <div ref={videoTimelineRef} className="w-full p-2 mt-2"></div>

        {/* <div className="flex w-full h-32 mt-2 bg-gray-100">
          <div className="w-full p-2 bg-gray-200 border rounded-lg ">aa</div>
        </div> */}
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
