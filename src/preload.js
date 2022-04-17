const { contextBridge, ipcRenderer } = require("electron");

// type IListener = (event: IpcRendererEvent, ...args: any[]) => void;

contextBridge.exposeInMainWorld("electronAPI", {
  processLandmarks: (file) => ipcRenderer.invoke("process:landmarks", file),
});


// window.addEventListener("DOMContentLoaded", () => {
//   const replaceText = (selector: string, text: string) => {
//     const element = document.getElementById(selector);
//     if (element) {
//       element.innerText = text;
//     }
//   };

//   for (const type of ["chrome", "node", "electron"]) {
//     replaceText(
//       `${type}-version`,
//       process.versions[type as keyof NodeJS.ProcessVersions]
//     );
//   }
// });
