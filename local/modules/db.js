const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./wordbook.db");

module.exports = {
  init() {
    db.run(`CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY,
      en TEXT,
      zh TEXT
    )`);
  },

  insertWord(en, zh) {
    return new Promise((resolve, reject) => {
      // 查询是否已经存在相同的 en 和 zh
      db.get(
        `SELECT * FROM words WHERE en = ? AND zh = ?`,
        [en, zh],
        function (err, row) {
          if (err) return reject(err);
          if (row) return resolve(false); // 已存在，不插入

          // 否则插入
          db.run(
            `INSERT INTO words (en, zh) VALUES (?, ?)`,
            [en, zh],
            function (err) {
              if (err) reject(err);
              else resolve(true); // 插入成功
            }
          );
        }
      );
    });
  },

  getAllWordsSorted() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM words ORDER BY en COLLATE NOCASE`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  searchWord(keyword) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM words WHERE en LIKE ? OR zh LIKE ?`,
        [`%${keyword}%`, `%${keyword}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  deleteWord(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM words WHERE id = ?`, [id], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  clearAllWords() {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM words`, [], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },

  updateWord(id, en, zh) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE words SET en = ?, zh = ? WHERE id = ?`,
        [en, zh, id],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  },
};
