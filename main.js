const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
  Menu,
  dialog,
} = require("electron");
const path = require("path");
let tray = null;
const fs = require("fs");
/*------ ipc part --------*/
ipcMain.on("win-control", (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  switch (action) {
    case "minimize":
      win.minimize();
      break;
    case "maximize":
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      break;
    case "close":
      win.hide(); // 或者 win.close()，视你需求决定
      break;
  }
});

ipcMain.handle("set-always-on-top", (event, flag) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.setAlwaysOnTop(flag);
});
ipcMain.handle("select-csv-file", async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-save-path", async () => {
  const result = await dialog.showSaveDialog({ defaultPath: "wordbook.csv" });
  return result.canceled ? null : result.filePath;
});

/*------ function part --------*/
function createWindows() {
  let scale = 40;
  mainWindow = new BrowserWindow({
    width: scale * 9,
    height: scale * 16,
    frame: false,
    resizable: false, // 防止用户拖动改变窗口大小
    icon: path.join(__dirname, "favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile("./renderer/index.html");
}

function createTray() {
  const iconPath = path.join(__dirname, "favicon.ico");
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: "显示主窗口", click: () => mainWindow?.show() },
    { label: "退出", click: app.quit },
  ]);

  tray.setToolTip("生词本");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
}
/*------ app part --------*/
app.whenReady().then(() => {
  createTray();
  createWindows();

  globalShortcut.register("CommandOrControl+Shift+W", () => {
    mainWindow.show();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindows();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
