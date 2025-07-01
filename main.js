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
const fs = require("fs");
let tray = null;
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
// 保存数据为 CSV
ipcMain.handle("export-csv", async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "保存为 CSV 文件",
    defaultPath: "words.csv",
    filters: [{ name: "CSV Files", extensions: ["csv"] }],
  });

  if (canceled || !filePath) return;

  // 拉取数据库中的所有词条
  const res = await fetch("https://wordapi.junedrinleng.com/words");
  const words = await res.json();

  const content = words.map((w) => `"${w.en}","${w.zh}"`).join("\n");
  fs.writeFileSync(filePath, content, "utf-8");
  return "导出成功";
});

// 从 CSV 导入数据
ipcMain.handle("import-csv", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "选择要导入的 CSV 文件",
    filters: [{ name: "CSV Files", extensions: ["csv"] }],
    properties: ["openFile"],
  });

  if (canceled || filePaths.length === 0) return;

  const content = fs.readFileSync(filePaths[0], "utf-8");
  const lines = content.split("\n");

  for (let line of lines) {
    const [en, zh] = line.split(",").map((s) => s.replace(/^"|"$/g, "").trim());
    if (en && zh) {
      await fetch("https://wordapi.junedrinleng.com/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ en, zh }),
      });
    }
  }

  return "导入成功";
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
