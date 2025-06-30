const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  winControl: (action) => ipcRenderer.send("win-control", action),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke("set-always-on-top", flag),
  // database operations
  deleteWord: (id) => ipcRenderer.invoke("delete-word", id),
  updateWord: (data) => ipcRenderer.invoke("update-word", data),
  clearWords: () => ipcRenderer.invoke("clear-words"),
  saveWord: (data) => ipcRenderer.invoke("save-word", data),
  getWords: () => ipcRenderer.invoke("get-words"),
  searchWord: (kw) => ipcRenderer.invoke("search-word", kw),
  // import/export data
  selectCSVFile: () => ipcRenderer.invoke("select-csv-file"),
  importFromCSV: (filePath) => ipcRenderer.invoke("import-csv", filePath),
  selectSavePath: () => ipcRenderer.invoke("select-save-path"),
  exportToCSV: (filePath) => ipcRenderer.invoke("export-csv", filePath),
});
