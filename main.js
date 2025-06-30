const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
  Menu,
} = require("electron");
const path = require("path");
const db = require("./db");
let tray = null;

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
ipcMain.handle("delete-word", async (e, id) => {
  await db.deleteWord(id);
});
ipcMain.handle("update-word", async (e, { id, en, zh }) => {
  await db.updateWord(id, en, zh);
});

function createWindows() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,
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

app.whenReady().then(() => {
  db.init();
  createTray();
  createWindows();

  globalShortcut.register("CommandOrControl+Shift+W", () => {
    mainWindow.show();
  });

  ipcMain.handle("save-word", async (event, { en, zh }) => {
    console.log("正在保存生词：", en, zh); // 👈 加这个
    await db.insertWord(en, zh);
    console.log("保存完成！");
  });

  ipcMain.handle("get-words", async () => {
    return await db.getAllWordsSorted();
  });

  ipcMain.handle("search-word", async (event, keyword) => {
    return await db.searchWord(keyword);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindows();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
