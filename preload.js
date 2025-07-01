const { contextBridge, ipcRenderer } = require("electron");

// 👉 把此处改成你的线上域名或公网 IP
const API = "https://wordapi.junedrinleng.com";

/* ──────────── 帮助函数 ──────────── */
function json(r) {
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}
function ok(r) {
  if (!r.ok) throw new Error(r.statusText);
}

/* ──────────── 暴露给渲染进程的统一 API ──────────── */
contextBridge.exposeInMainWorld("api", {
  /* === 窗口 / 系统 === */
  winControl: (action) => ipcRenderer.send("win-control", action),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke("set-always-on-top", flag),
  selectCSVFile: () => ipcRenderer.invoke("select-csv-file"),
  selectSavePath: () => ipcRenderer.invoke("select-save-path"),

  /* === 词库 CRUD：全部走远端 API === */
  saveWord: (d) =>
    fetch(`${API}/words`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    }).then(ok),

  getWords: () => fetch(`${API}/words`).then(json),

  searchWord: (kw) =>
    fetch(`${API}/words?q=${encodeURIComponent(kw)}`).then(json),

  updateWord: ({ id, en, zh }) =>
    fetch(`${API}/words/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ en, zh }),
    }).then(ok),

  deleteWord: (id) =>
    fetch(`${API}/words/${id}`, { method: "DELETE" }).then(ok),

  clearWords: () => fetch(`${API}/words`, { method: "DELETE" }).then(ok),
});
