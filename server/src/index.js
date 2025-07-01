import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import dotenv from "dotenv";
import { parse } from "fast-csv";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ───────────── 业务路由 ─────────────

// POST /words/import   (multipart/form-data 里携带 file 字段)
app.post("/words/import", async (req, res) => {
  try {
    const file = req.files?.file; // 用 express-fileupload 或 multer
    if (!file) return res.status(400).send("no file");

    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(file.tempFilePath)
        .pipe(parse({ headers: false, trim: true }))
        .on("error", reject)
        .on("data", (row) => rows.push(row))
        .on("end", resolve);
    });

    // 使用 COPY…FROM STDIN 性能更好，这里演示最直观的批量 INSERT
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
// DELETE /words    —— 清空整个词库
app.delete("/words", async (_req, res) => {
  try {
    await pool.query("TRUNCATE TABLE words RESTART IDENTITY");
    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ───────────── 启动 ─────────────
app.listen(port, () => console.log(`👍  API running on :${port}`));
