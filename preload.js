const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  winControl: (action) => ipcRenderer.send("win-control", action),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke("set-always-on-top", flag),
  importCSV: () => ipcRenderer.invoke("import-csv"),
  exportCSV: () => ipcRenderer.invoke("export-csv"),

  saveWord: (d) =>
    fetch("https://wordapi.junedrinleng.com/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
    }),

  getWords: () =>
    fetch("https://wordapi.junedrinleng.com/words").then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    }),

  searchWord: (kw) =>
    fetch(
      `https://wordapi.junedrinleng.com/words?q=${encodeURIComponent(kw)}`
    ).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    }),

  updateWord: ({ id, en, zh }) =>
    fetch(`https://wordapi.junedrinleng.com/words/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ en, zh }),
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
    }),

  deleteWord: (id) =>
    fetch(`https://wordapi.junedrinleng.com/words/${id}`, {
      method: "DELETE",
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
    }),

  clearWords: () =>
    fetch("https://wordapi.junedrinleng.com/words", {
      method: "DELETE",
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
    }),
});
