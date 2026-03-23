import { ipcMain } from "electron";
import {
  startOAuthFlow,
  getSession,
  restoreSession,
  refreshSession,
  logout,
  setAuthStateCallback,
  type AuthUser,
} from "./auth.service";
import type { BrowserWindow } from "electron";

let mainWindow: BrowserWindow | null = null;

export function setAuthMainWindow(win: BrowserWindow): void {
  mainWindow = win;
}

export function setupAuthApiHandler(): void {
  // Forward auth state changes to renderer
  setAuthStateCallback((user: AuthUser | null) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("auth:state-change", user);
    }
  });

  ipcMain.handle(
    "auth:start-oauth",
    (_event, provider: "google" | "apple") => {
      return startOAuthFlow(provider);
    }
  );

  ipcMain.handle("auth:get-session", () => {
    return getSession();
  });

  ipcMain.handle("auth:restore-session", () => {
    return restoreSession();
  });

  ipcMain.handle("auth:refresh", () => {
    return refreshSession();
  });

  ipcMain.handle("auth:logout", () => {
    return logout();
  });
}
