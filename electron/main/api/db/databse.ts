// src/database.ts
import Database from "better-sqlite3";
import type { Database as DB } from "better-sqlite3";
import path from "path";
import { app } from "electron"; // 假设在 Electron 环境

// 推荐将数据库文件存储在用户数据目录中
const dbPath = path.join(app.getPath("userData"), "language-data.db");
let db: DB;

try {
  // 创建并导出一个单例数据库实例
  db = new Database(dbPath); //, { verbose: console.log }); // 增加日志输出
  console.log("Database connected successfully at", dbPath);
} catch (error) {
  console.error("Failed to connect to the database:", error);
  // 在生产环境中，你可能希望更优雅地处理这个错误
  // 例如，显示一个错误消息给用户，或者退出应用
  app.quit();
  // throw error; // 或者直接抛出异常
}

// 在 Node.js 进程退出时，优雅地关闭数据库连接
process.on("exit", () => {
  if (db) {
    db.close();
    console.log("Database connection closed.");
  }
});

export default db!;
