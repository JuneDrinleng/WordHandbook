import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // 如果跑在云数据库且必须 SSL，可加：
  // ssl: { rejectUnauthorized: false }
});
