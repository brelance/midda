// src/repository/token-data.repository.ts

import { SubtitleLineData, TokenData } from "../../../../src/types/types";
import db from "./databse";

export class SubtitleLinesRepository {
  constructor() {
    this.init();
  }

  private init(): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS subtitle_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        start_time REAL NOT NULL,
        end_time REAL NOT NULL,
        original_text TEXT NOT NULL,
        tokens_json TEXT NOT NULL,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
      );
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_subtitle_lines_video_id ON subtitle_lines(video_id);
    `);
  }

  // --- CREATE (更高效) ---
  public addSubtitlesByVideoId(
    videoId: string,
    subtitles: SubtitleLineData[]
  ): { success: boolean; message: string } {
    console.log(`[DEBUG] addSubtitlesForVideo: videoId = ${videoId}`);
    // // Check if subtitles already exist for this videoId in the subtitle_lines table

    const insert = db.transaction(() => {
      const checkStmt = db.prepare(
        "SELECT id FROM subtitle_lines WHERE video_id = ? AND start_time = ? AND end_time = ?"
      );
      const insertStmt = db.prepare(
        "INSERT INTO subtitle_lines (video_id, start_time, end_time, original_text, tokens_json) VALUES (?, ?, ?, ?, ?)"
      );

      for (const line of subtitles) {
        const existing = checkStmt.get(videoId, line.startTime, line.endTime);
        if (!existing) {
          // 将token数组序列化为JSON字符串
          const tokensJson = JSON.stringify(line.tokens);
          insertStmt.run(
            videoId,
            line.startTime,
            line.endTime,
            line.originalText,
            tokensJson
          );
        }
      }
    });

    try {
      insert();
      return { success: true, message: "Subtitles added successfully." };
    } catch (error) {
      console.error("Failed to add subtitles:", error);
      return { success: false, message: (error as Error).message };
    }
  }

  // --- READ (性能极高) ---
  public getSubtitlesByVideoId(videoId: string): SubtitleLineData[] | null {
    console.log(`[DEBUG] getSubtitlesByVideoId: videoId = ${videoId}`);
    const sql = `
      SELECT
        start_time,
        end_time,
        original_text,
        tokens_json
      FROM subtitle_lines
      WHERE video_id = ?
      ORDER BY start_time;
    `;

    // 查询结果已经是按行聚合好的
    interface SubtitleRow {
      start_time: number;
      end_time: number;
      original_text: string;
      translation_text: string;
      tokens_json: string;
    }
    const rows = db.prepare(sql).all(videoId) as SubtitleRow[];

    if (!rows || rows.length === 0) {
      console.log(`[DEBUG] No subtitles found for videoId = ${videoId}`);
      return null;
    }

    console.log(
      `[DEBUG] Found ${rows.length} subtitle lines for videoId = ${videoId}`
    );
    // 只需解析JSON字符串即可，无需复杂的内存重组
    return rows.map((row) => ({
      // id: row.id,
      startTime: row.start_time,
      endTime: row.end_time,
      originalText: row.original_text,
      tokens: JSON.parse(row.tokens_json), // 将JSON字符串反序列化为对象数组
    }));
  }

  // --- UPDATE (低效，不推荐频繁使用) ---
  /**
   * 更新特定行中的一个Token。
   * @param lineId 要更新的字幕行的ID
   * @param tokenIndex 要更新的Token在该行tokens数组中的索引
   * @param tokenData 新的Token数据
   * @returns
   */
  public updateToken(
    lineId: number,
    tokenIndex: number,
    tokenData: Partial<TokenData>
  ): { success: boolean } {
    // 这是一个读-改-写操作，性能较低
    try {
      const row = db
        .prepare("SELECT tokens_json FROM subtitle_lines WHERE id = ?")
        .get(lineId) as {
        tokens_json: string;
      };
      if (!row) {
        return { success: false };
      }

      const tokens = JSON.parse(row.tokens_json) as TokenData[];
      if (tokenIndex < 0 || tokenIndex >= tokens.length) {
        return { success: false }; // 索引越界
      }

      // 更新内存中的token对象
      tokens[tokenIndex] = { ...tokens[tokenIndex], ...tokenData };

      // 将整个数组序列化并写回数据库
      const newTokensJson = JSON.stringify(tokens);
      const result = db
        .prepare("UPDATE subtitle_lines SET tokens_json = ? WHERE id = ?")
        .run(newTokensJson, lineId);

      return { success: result.changes > 0 };
    } catch (error) {
      console.error("Failed to update token:", error);
      return { success: false };
    }
  }

  // --- DELETE (高效) ---
  public deleteSubtitlesByVideoId(videoId: string): { success: boolean } {
    console.log("[deleteSubtitlesByVideoId] videoid " + videoId);
    const stmt = db.prepare("DELETE FROM subtitle_lines WHERE video_Id = ?");
    const result = stmt.run(videoId);
    return { success: result.changes > 0 };
  }
}
