declare global {
  interface Window {
    VideoFrame: any;
    electronAPI: any
  }
}

declare module 'plotly.js-dist'

window.VideoFrame = window.VideoFrame || {};
