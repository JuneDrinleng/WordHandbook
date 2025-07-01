const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("api", {
  winControl: (action) => ipcRenderer.send("win-control", action),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke("set-always-on-top", flag),
  importCSV: () => ipcRenderer.invoke("import-csv"),
  exportCSV: () => ipcRenderer.invoke("export-csv"),
  setApiBase: (url) => ipcRenderer.invoke("set-api-base", url),

  saveWord: (d) =>
    fetch(`${localStorage.getItem("apiBase")}/words`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
    }),

  getWords: () =>
    fetch(`${localStorage.getItem("apiBase")}/words`).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    }),

  searchWord: (kw) =>
    fetch(
      `${localStorage.getItem("apiBase")}/words?q=${encodeURIComponent(kw)}`
    ).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    }),

  updateWord: ({ id, en, zh }) =>
    fetch(`${localStorage.getItem("apiBase")}/words/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ en, zh }),
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
    }),

  deleteWord: (id) =>
    fetch(`${localStorage.getItem("apiBase")}/words/${id}`, {
      method: "DELETE",
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
    }),

  clearWords: () =>
    fetch(`${localStorage.getItem("apiBase")}/words`, {
      method: "DELETE",
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
    }),
});
