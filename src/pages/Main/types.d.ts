declare global {
  interface Window {
    VideoFrame: any;
    electronAPI: any
  }
}

window.VideoFrame = window.VideoFrame || {};

declare module 'plotly.js-dist';