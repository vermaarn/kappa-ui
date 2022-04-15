import { useRef, useEffect } from "react";

const useCanvas = (
  draw: (context: CanvasRenderingContext2D, frameCount: number) => void,
  options: {
    context?: "2d";
    predraw: (
      context: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement
    ) => void;
    postdraw: (ctx: CanvasRenderingContext2D) => void;
  }
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext(options.context || "2d");
    let frameCount = 0;
    let animationFrameId: number;
    const render = () => {
      frameCount++;
      options.predraw(context, canvas);
      draw(context, frameCount);
      options.postdraw(context);
      animationFrameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [draw]);
  return canvasRef;
};
export default useCanvas;
