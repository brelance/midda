import { ipcMain } from "electron";
import { SubtitleLinesRepository } from "../../db/subtitles.db";
import { TokenData, SubtitleLineData } from "../../../../../src/types/types";

const subtitleLinesRepository = new SubtitleLinesRepository();

export function registerDbHandlers(): void {
  ipcMain.handle(
    "db:subtitles:addSubtitlesByVideoId",
    (_, videoId: string, subtitles: SubtitleLineData[]) => {
      return subtitleLinesRepository.addSubtitlesByVideoId(videoId, subtitles);
    }
  );

  ipcMain.handle("db:subtitles:getSubtitlesByVideoId", (_, videoId: string) => {
    return subtitleLinesRepository.getSubtitlesByVideoId(videoId);
  });

  // 注意这里的接口参数变化
  ipcMain.handle(
    "db:subtitles:updateToken",
    (_, lineId: number, tokenIndex: number, tokenData: Partial<TokenData>) => {
      return subtitleLinesRepository.updateToken(lineId, tokenIndex, tokenData);
    }
  );

  ipcMain.handle(
    "db:subtitles:deleteSubtitlesByVideoId",
    (_, videoId: string) => {
      return subtitleLinesRepository.deleteSubtitlesByVideoId(videoId);
    }
  );
}
