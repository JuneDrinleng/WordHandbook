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
let apiBase = null;

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

ipcMain.handle("set-api-base", (event, url) => {
  apiBase = url;
  console.log("✅ 设置 API 地址为：", apiBase);
});

// 保存数据为 CSV
ipcMain.handle("export-csv", async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "保存为 CSV 文件",
    defaultPath: "words.csv",
    filters: [{ name: "CSV Files", extensions: ["csv"] }],
  });

  if (canceled || !filePath) return;

  const win = BrowserWindow.getFocusedWindow();

  const apiBase = await win.webContents.executeJavaScript(
    "localStorage.getItem('apiBase')"
  );
  const token = await win.webContents.executeJavaScript(
    "localStorage.getItem('apiToken')"
  );

  if (!apiBase || !apiBase.startsWith("http")) {
    throw new Error("❌ API 地址未设置或无效");
  }

  const res = await fetch(`${apiBase}/words`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`导出失败：${res.status} - ${errText}`);
  }

  const words = await res.json();

  // ✅ 转义函数：双引号 → 两个双引号，整体用双引号包裹
  const escapeCSV = (s) => `"${(s || "").replace(/"/g, '""')}"`;

  // ✅ 构建 CSV 内容
  const csvLines = words.map((w) => `${escapeCSV(w.en)},${escapeCSV(w.zh)}`);
  const content = "\uFEFF" + csvLines.join("\n"); // 添加 BOM，防止 Excel 中文乱码

  // ✅ 写入文件
  fs.writeFileSync(filePath, content, "utf8");
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

  const win = BrowserWindow.getFocusedWindow();
  const apiBase = await win.webContents.executeJavaScript(
    "localStorage.getItem('apiBase')"
  );
  const token = await win.webContents.executeJavaScript(
    "localStorage.getItem('apiToken')"
  );

  if (!apiBase || !apiBase.startsWith("http")) {
    throw new Error("❌ API 地址未设置或无效");
  }

  const content = fs.readFileSync(filePaths[0], "utf-8");
  const lines = content.split("\n");

  for (let line of lines) {
    const [en, zh] = line.split(",").map((s) => s.replace(/^"|"$/g, "").trim());
    if (en && zh) {
      const res = await fetch(`${apiBase}/words`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ en, zh }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          // 忽略重复
          console.log(`跳过重复词条：${en}`);
          continue;
        } else {
          const errText = await res.text();
          throw new Error(`导入失败：${res.status} - ${errText}`);
        }
      }
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
    { label: "📕单词本", click: () => mainWindow?.show() },
    { label: "⏏️退出", click: app.quit },
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
