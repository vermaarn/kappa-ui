import React from "react";
import useCanvas from "../hooks/useCanvas";

//https://medium.com/@pdx.lucasm/canvas-with-react-js-32e133c05258
const Canvas: React.FC<{
  draw: (context: CanvasRenderingContext2D, frameCount: number) => void;
  predraw?: (
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => void;
  postdraw?: (ctx: CanvasRenderingContext2D) => void;
}> = (props) => {
  const { draw, predraw = _predraw, postdraw = _postdraw } = props;

  const canvasRef = useCanvas(draw, { predraw, postdraw });
  return <canvas ref={canvasRef} {...props} />;
};

const _postdraw = (ctx: CanvasRenderingContext2D) => {
  //   index++;
  ctx.restore();
};

const _predraw = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
) => {
  context.save();
  resizeCanvas(canvas);
  const { width, height } = context.canvas;
  context.clearRect(0, 0, width, height);
};

function resizeCanvas(canvas: HTMLCanvasElement) {
  const { width, height } = canvas.getBoundingClientRect();

  if (canvas.width !== width || canvas.height !== height) {
    const { devicePixelRatio: ratio = 1 } = window;
    const context = canvas.getContext("2d");
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);
    return true;
  }

  return false;
}

export default Canvas;
