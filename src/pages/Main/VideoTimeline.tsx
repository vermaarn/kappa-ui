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

    timeline.on("select", (e) => {
      if (e.items) {
        const itemGroup = e.items.reduce((prevArr: any[], itemId: number) => {
          const item = items.get(itemId);
          if (item.content !== NEUTRAL_LANDMARK_ICON) {
            return [item, ...prevArr];
          }
          return prevArr;
        }, []);

        // setSelectedTimeBlocks(itemGroup);
      }
    });

    timeline.on("doubleClick", (e) => {
      if (e.item) {
        const item = items.get(e.item as number | string);
        if (!item.end) return;
        const itemStart = new Date(item.start).getTime();
        const itemEnd = new Date(item.end).getTime();

        const neutralLandmark = {
          content: NEUTRAL_LANDMARK_ICON,
          editable: true,
          start: itemStart + Math.floor((itemEnd - itemStart) / 2),
          group: e.group,
        };

        items.add(neutralLandmark);
      }
    });


  }, []);

  return <div ref={videoTimelineRef} className="w-full p-2 mt-2"></div>;
}

export default VideoTimeline;
