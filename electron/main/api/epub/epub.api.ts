import { ipcMain, dialog } from 'electron';
import { EPUBService } from './epubService';

export function setupEpubApiHandler() {
  const epubService = new EPUBService();

  ipcMain.handle('epub:select-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'EPUB Files', extensions: ['epub'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('epub:parse-file', async (_, filePath: string) => {
    try {
      return await epubService.parseEpubFile(filePath);
    } catch (error) {
      console.error('EPUB解析失败:', error);
      throw error;
    }
  });

  ipcMain.handle('epub:get-cover', async (_, filePath: string) => {
    try {
      return await epubService.extractCover(filePath);
    } catch (error) {
      console.error('封面提取失败:', error);
      throw error;
    }
  });
}