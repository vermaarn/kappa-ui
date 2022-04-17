import React, { useEffect, useRef } from "react";

import {
  Timeline,
  DataSet,
  TimelineOptions,
  TimelineOptionsItemCallbackFunction,
} from "vis-timeline/standalone";

interface ITimeBlock {
  id?: number | string;
  content: string;
  editable: boolean;
  start: number;
  end?: number;
  group: number;
  neutralId?: string;
}

function VideoTimeline() {
  const videoTimelineRef = useRef<HTMLDivElement>(null);
  const NEUTRAL_LANDMARK_ICON = "  😐  ";

  useEffect(() => {
    const container = videoTimelineRef.current;
    if (!container) return;

    const items = new DataSet<ITimeBlock>([]);

    const groups = [
      "nose",
      "l_brow",
      "r_brow",
      "l_eye",
      "r_eye",
      "i_lips",
      "o_lips",
    ].map((name, idx) => ({
      id: idx,
      content: name,
      title: name,
      value: idx + 1,
    }));

    const options: TimelineOptions = {
      min: 0,
      max: 100,
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

    items.add([
      {
        id: "asdsada",
        content: "",
        editable: true,
        start: 0,
        end: 23,
        group: 1,
        neutralId: "sadsadasdq2",
      },
      {
        id: "sadsadasdq2",
        content: NEUTRAL_LANDMARK_ICON,
        editable: true,
        start: 12,
        group: 1,
      },
    ]);
  }, []);

  return <div ref={videoTimelineRef} className="w-full p-2 mt-2"></div>;
}

export default VideoTimeline;
