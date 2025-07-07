const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  winControl: (action) => ipcRenderer.send("win-control", action),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke("set-always-on-top", flag),
  importCSV: () => ipcRenderer.invoke("import-csv"),
  exportCSV: () => ipcRenderer.invoke("export-csv"),
  setApiBase: (url) => ipcRenderer.invoke("set-api-base", url),

  saveFocus: ({ start_time, end_time, task }) => {
    const api = localStorage.getItem("apiBase");
    const token = localStorage.getItem("apiToken");
    return fetch(`${api}/focus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ start_time, end_time, task }),
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
    });
  },

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
  getBills: () => {
    const api = localStorage.getItem("apiBase");
    const token = localStorage.getItem("apiToken");
    return fetch(`${api}/bills`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    });
  },
  addBill: async (bill) => {
    const api = localStorage.getItem("apiBase");
    const token = localStorage.getItem("apiToken");

    const res = await fetch(`${api}/bills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(bill),
    });

    if (!res.ok) throw new Error(await res.text());
  },
  refreshElectricity: () => {
    const elecUser = localStorage.getItem("elecUser") || "";
    const elecPass = localStorage.getItem("elecPass") || "";
    const apiBase = localStorage.getItem("apiBase") || "";
    const apiToken = localStorage.getItem("apiToken") || "";

    return ipcRenderer.invoke("refresh-electricity", {
      elecUser,
      elecPass,
      apiBase,
      apiToken,
    });
  },
});

contextBridge.exposeInMainWorld("settings", {
  get: (k) => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, v),
  getAll: () => {
    const keys = ["apiBase", "apiToken", "elecUser", "elecPass"];
    return keys.reduce((o, k) => ({ ...o, [k]: localStorage.getItem(k) }), {});
  },
  setAll: (obj) =>
    Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, v)),
});
