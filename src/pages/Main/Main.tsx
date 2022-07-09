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
import {
  Timeline,
  DataSet,
  TimelineOptions,
  TimelineOptionsItemCallbackFunction,
} from "vis-timeline/standalone";

import VideoPlayer from "./VideoPlayer";
import VideoTimeline from "./VideoTimeline";
import MotionView from "./MotionView";
import Toolbar from "./Toolbar";
import { Toaster } from "react-hot-toast";

type LandmarkGroupType =
  | "nose"
  | "l_brow"
  | "r_brow"
  | "l_eye"
  | "r_eye"
  | "i_lips"
  | "o_lips";

interface ITimeBlock {
  id?: number | string;
  content: string;
  editable: boolean;
  start: number;
  end?: number;
  group: number;
  neutralId?: string;
}

interface IRecordedTimeBlock {
  id?: number | string;
  neutralPoseTime: number;
  start: number;
  end?: number;
}

function Main() {
  const [currentRefTool, setCurrentRefTool] = useState("Q");


  return (
    <div className="flex w-full">
      <Toaster />
      <div className="flex flex-col w-full p-2">
        <div className="flex w-full">
          <div className="w-1/2 h-full p-1 bg-gray-200">
            <VideoPlayer />
          </div>
          <Toolbar toolSetter={setCurrentRefTool} />
          <div className="w-1/2 h-full p-1 bg-gray-200">
            <MotionView />
          </div>
        </div>

        <VideoTimeline />
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
