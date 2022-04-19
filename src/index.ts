import { app, BrowserWindow, protocol, dialog, ipcMain } from "electron";
import path from "path";
import { execFile } from "child_process";

// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

function fileHandler(req: any, callback: any) {
  let requestedPath = req.url.substr(12);
  // Write some code to resolve path, calculate absolute path etc
  let check = true; // Write some code here to check if you should return the file to renderer process

  if (!check) {
    callback({
      // -6 is FILE_NOT_FOUND
      // https://source.chromium.org/chromium/chromium/src/+/master:net/base/net_error_list.h
      error: -6,
    });
    return;
  }
  callback(decodeURI(path.normalize(requestedPath)));

  // callback({
  //   path: requestedPath,
  // });
}

function interceptFileHandler(request: any, callback: any) {
  const url = request.url.substr(7); /* all urls start with 'file://' */

  callback({ path: url }, (err: any) => {
    if (err) console.error("Failed to register protocol");
  });
}

async function handleProcessLandmarks(_event: Electron.IpcMainInvokeEvent, ...args: any[]) {
  const pythonFile = "/python_scripts/hello.py";
  const pythonEnv = "/python_scripts/env/bin/python3.9"

  const base = path.join(__dirname, "../..");
  const pythonScriptPath = path.join(base, pythonFile);
  const pythonEnvPath = path.join(base, pythonEnv)

  const filePath = args[0]
  console.log(filePath, 'A')

  const child = execFile(pythonEnvPath, [pythonScriptPath, filePath]);

  let data = "";
  for await (const chunk of child.stdout) {
    data += chunk;
  }

  let error = "";
  for await (const chunk of child.stderr) {
    console.error("stderr chunk: " + chunk);
    error += chunk;
  }

  const exitCode = await new Promise((resolve, reject) => {
    child.on("close", resolve);
  });

  if (exitCode) {
    throw new Error(`subprocess error exit ${exitCode}, ${error}`);
  }

  return data;
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: { preload: process.env.MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  protocol.registerFileProtocol("allowfile", fileHandler);
  protocol.interceptFileProtocol("file", interceptFileHandler);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// app.on("ready", createWindow);

app.whenReady().then(() => {
  ipcMain.handle("process:landmarks", handleProcessLandmarks);
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// app.on("activate", () => {
//   // On OS X it's common to re-create a window in the app when the
//   // dock icon is clicked and there are no other windows open.
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow();
//   }
// });

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
