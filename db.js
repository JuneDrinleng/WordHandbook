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
      db.run(
        `INSERT INTO words (en, zh) VALUES (?, ?)`,
        [en, zh],
        function (err) {
          if (err) reject(err);
          else resolve();
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
