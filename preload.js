const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  saveWord: (data) => ipcRenderer.invoke("save-word", data),
  getWords: () => ipcRenderer.invoke("get-words"),
  searchWord: (kw) => ipcRenderer.invoke("search-word", kw),
  winControl: (action) => ipcRenderer.send("win-control", action),
  // preload.js
  deleteWord: (id) => ipcRenderer.invoke("delete-word", id),
  updateWord: (data) => ipcRenderer.invoke("update-word", data),
});
