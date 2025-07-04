// server.js — Express + PostgreSQL + 自动白名单
import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import dotenv from "dotenv";
import { parse } from "fast-csv";
import fs from "fs";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 若部署在反向代理（Nginx / Traefik）后，可开启以获取真实 IP
if (process.env.TRUST_PROXY) app.set("trust proxy", true);

app.use(cors());
app.use(express.json());

// ───────────── 白名单缓存 ─────────────
const whitelist = new Set(); // 已放行 IP
const whitelistExpire = new Map(); // ip → 过期时间
const WHITELIST_TTL = 24 * 60 * 60 * 1000; // 24 h，可按需调整

function addToWhitelist(ip) {
  whitelist.add(ip);
  whitelistExpire.set(ip, Date.now() + WHITELIST_TTL);
}

// // 每 10 min 清理一次过期条目
// setInterval(() => {
//   const now = Date.now();
//   for (const [ip, expireAt] of whitelistExpire) {
//     if (expireAt <= now) {
//       whitelist.delete(ip);
//       whitelistExpire.delete(ip);
//     }
//   }
// }, 10 * 60 * 1000);
// ──────────────────────────────────────

// ───────────── 鉴权中间件 ─────────────
app.use((req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",").shift()?.trim() || req.ip;

  // 已在白名单：直接放行
  if (whitelist.has(ip)) return next();

  // 检查 Authorization 头
  const token = req.headers.authorization;
  const expected = `Bearer ${process.env.API_TOKEN}`;
  if (token !== expected) {
    return res
      .status(403)
      .json({ error: "Forbidden: Invalid or missing token" });
  }

  // ✅ 首次通过：加入白名单
  addToWhitelist(ip);
  next();
});
// ──────────────────────────────────────

// ───────────── 业务路由 ─────────────
// GET /words  或 /words?q=abc
app.get("/words", async (req, res) => {
  const kw = req.query.q;
  const sql = kw
    ? "SELECT * FROM words WHERE en ILIKE $1 OR zh ILIKE $1 ORDER BY en"
    : "SELECT * FROM words ORDER BY en";
  const args = kw ? [`%${kw}%`] : [];
  try {
    const { rows } = await pool.query(sql, args);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /words  { "en": "...", "zh": "..." }
app.post("/words", async (req, res) => {
  const { en, zh } = req.body;
  try {
    await pool.query("INSERT INTO words (en, zh) VALUES ($1,$2)", [en, zh]);
    res.sendStatus(201);
  } catch (e) {
    if (e.code === "23505") return res.sendStatus(409); // 唯一键冲突
    res.status(500).json({ error: e.message });
  }
});

// PUT /words/:id
app.put("/words/:id", async (req, res) => {
  const { en, zh } = req.body;
  try {
    await pool.query("UPDATE words SET en=$1, zh=$2 WHERE id=$3", [
      en,
      zh,
      req.params.id,
    ]);
    res.sendStatus(204);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /words/:id
app.delete("/words/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM words WHERE id=$1", [req.params.id]);
    res.sendStatus(204);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /words —— 清空整个词库
app.delete("/words", async (_req, res) => {
  try {
    await pool.query("TRUNCATE TABLE words RESTART IDENTITY");
    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /words/import   (multipart/form-data 里携带 file 字段)
app.post("/words/import", async (req, res) => {
  try {
    const file = req.files?.file; // 需配合 express-fileupload / multer
    if (!file) return res.status(400).send("no file");

    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(file.tempFilePath)
        .pipe(parse({ headers: false, trim: true }))
        .on("error", reject)
        .on("data", (row) => rows.push(row))
        .on("end", resolve);
    });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const [en, zh] of rows) {
        await client.query(
          "INSERT INTO words (en, zh) VALUES ($1,$2) ON CONFLICT DO NOTHING",
          [en, zh]
        );
      }
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    res.json({ imported: rows.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});
// —— 新增：GET /bills 查询电费记录 ——
app.get("/bills", async (req, res) => {
  try {
    // 支持 ?limit=10 和 ?since=2025-07-03%2000:00:00
    const limit = parseInt(req.query.limit, 10) || 100;
    const since = req.query.since || "1970-01-01 00:00:00";

    const { rows } = await pool.query(
      `SELECT record_time, fee_amount
         FROM electricity_bill
        WHERE record_time >= $1
        ORDER BY record_time DESC
        LIMIT $2`,
      [since, limit]
    );

    res.json(rows);
  } catch (err) {
    console.error("查询电费失败", err);
    res.status(500).json({ error: err.message });
  }
});
// POST /bills   { "record_time": "2025-07-04 12:00:00", "fee_amount": 23.45 }
app.post("/bills", async (req, res) => {
  const { record_time, fee_amount } = req.body;

  // —— 简单参数校验 ——
  if (!record_time || fee_amount === undefined) {
    return res.status(400).json({ error: "missing record_time or fee_amount" });
  }
  // 也可加更严格的日期 / 数字格式校验

  try {
    await pool.query(
      `INSERT INTO electricity_bill (record_time, fee_amount)
       VALUES ($1, $2)`,
      [record_time, fee_amount]
    );
    res.sendStatus(201); // Created
  } catch (e) {
    console.error("写入电费失败", e);
    res.status(500).json({ error: e.message });
  }
});

// ───────────── 启动 ─────────────
app.listen(port, () => {
  console.log(`👍 API running on :${port}`);
});
