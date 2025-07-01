const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  winControl: (action) => ipcRenderer.send("win-control", action),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke("set-always-on-top", flag),
  importCSV: () => ipcRenderer.invoke("import-csv"),
  exportCSV: () => ipcRenderer.invoke("export-csv"),
  setApiBase: (url) => ipcRenderer.invoke("set-api-base", url),

  saveWord: (d) => {
    const api = localStorage.getItem("apiBase");
    const token = localStorage.getItem("apiToken");
    return fetch(`${api}/words`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(d),
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
    });
  },

  getWords: () => {
    const api = localStorage.getItem("apiBase");
    const token = localStorage.getItem("apiToken");
    return fetch(`${api}/words`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    });
  },

  searchWord: (kw) => {
    const api = localStorage.getItem("apiBase");
    const token = localStorage.getItem("apiToken");
    return fetch(`${api}/words?q=${encodeURIComponent(kw)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    });
  },

  updateWord: ({ id, en, zh }) => {
    const api = localStorage.getItem("apiBase");
    const token = localStorage.getItem("apiToken");
    return fetch(`${api}/words/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ en, zh }),
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
    });
  },

  deleteWord: (id) => {
    const api = localStorage.getItem("apiBase");
    const token = localStorage.getItem("apiToken");
    return fetch(`${api}/words/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
    });
  },

  clearWords: () => {
    const api = localStorage.getItem("apiBase");
    const token = localStorage.getItem("apiToken");
    return fetch(`${api}/words`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
    });
  },
});
