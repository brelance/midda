import { ipcMain } from "electron";
import {
  login,
  backendRequest,
  getSession,
  restoreSession,
  refreshSession,
  logout,
  setAuthStateCallback,
  type AuthUser,
} from "./auth.service";
import type { BrowserWindow } from "electron";
import { isAllowedBackendRequest } from './jwtClient';

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

  ipcMain.handle('auth:login', (_event, identifier: string, password: string) => {
    if (typeof identifier !== 'string' || typeof password !== 'string') throw new Error('无效的登录参数');
    return login(identifier, password);
  });
  ipcMain.handle('auth:request', (_event, path: string, method: string, body?: unknown) => {
    if (!isAllowedBackendRequest(path, method)) throw new Error('不允许的后端请求');
    return backendRequest(path, method, body);
  });

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
