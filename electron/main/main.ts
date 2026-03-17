import { fileURLToPath } from "node:url";
import path from "node:path";
import { registerDbHandlers } from "./api/db/db.api/db.api";
import { setupWordDetailApiHandler } from "./api/llm/word_detail/detail.api";
import { setupWordDictApiHandler } from "./api/llm/word_detail/wordict.api";
import { setupTokensApiHandler } from "./api/llm/tokens.api";
import { setupInteractiveRoleplayApiHandler } from "./api/llm/interactive_roleplay/interactiveRoleplay.api";
import { setupEpubApiHandler } from "./api/epub/epub.api";
import { registerEpubImageScheme, setupEpubImageProtocol } from "./api/epub/epubProtocol";
import { setupTtsApiHandler } from "./api/tts/tts.api";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow } from "electron";

// Register epub-img:// scheme as privileged BEFORE app is ready
registerEpubImageScheme();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

console.log("DIRNAME", __dirname);
console.log("VITE_DEV_SERVER_URL:", VITE_DEV_SERVER_URL);
console.log("MAIN_DIST:", MAIN_DIST);
console.log("RENDERER_DIST:", RENDERER_DIST);

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    // icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
    minWidth: 360,
    minHeight: 240,
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  registerDbHandlers();

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // ipcMain.on("ping", () => console.log("pong"));

  // --- API Listener ---
  setupTokensApiHandler();
  setupWordDetailApiHandler();
  setupWordDictApiHandler();
  setupInteractiveRoleplayApiHandler();

  // 新增EPUB处理器
  setupEpubApiHandler();
  setupTtsApiHandler();

  // Setup epub-img:// protocol handler
  setupEpubImageProtocol();

  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  console.log("Application is about to quit.");
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
