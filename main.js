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
const db = require("./modules/db");
const { spawn } = require("child_process");
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
ipcMain.handle("delete-word", async (e, id) => {
  await db.deleteWord(id);
});
ipcMain.handle("update-word", async (e, { id, en, zh }) => {
  await db.updateWord(id, en, zh);
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

ipcMain.handle("import-csv", async (event, filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  let count = 0;
  let skipped = 0; // 重复跳过条数
  function isEnglish(text) {
    return /^[\x00-\x7F]+$/.test(text); // ASCII范围判断，不包含中文
  }

  function isChinese(text) {
    return /^[\u4e00-\u9fa5]+$/.test(text); // 简体中文常用字符
  }

  for (let line of lines) {
    const [enRaw, zhRaw] = line.split(",");
    const en = enRaw?.trim();
    const zh = zhRaw?.trim();

    if (!en || !zh) continue; // 空行跳过

    if (!isEnglish(en)) continue; // 英文部分不是英文，跳过

    if (!isChinese(zh)) continue; // 中文部分不是中文，跳过

    const inserted = await db.insertWord(en, zh);
    if (inserted) {
      count++;
    } else {
      skipped++;
    }
  }

  return count;
});

ipcMain.handle("select-save-path", async () => {
  const result = await dialog.showSaveDialog({ defaultPath: "wordbook.csv" });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle("export-csv", async (event, filePath) => {
  const words = await db.getAllWordsSorted(); // ✅ 改这里
  const content = words.map((w) => `${w.en},${w.zh}`).join("\n");
  fs.writeFileSync(filePath, "\uFEFF" + content, "utf-8");
});
ipcMain.handle("clear-words", async () => {
  await db.clearAllWords();
});

/*------ function part --------*/
let deeplxProcess = null;

function startDeeplx() {
  const exePath = path.join(__dirname, "assets", "deepl.exe"); // 你打包时的路径
  deeplxProcess = spawn(exePath, [], {
    detached: false,
    stdio: "ignore",
  });

  console.log("✅ deeplx 已启动");
}

function stopDeeplx() {
  if (deeplxProcess) {
    deeplxProcess.kill();
    console.log("🛑 deeplx 已关闭");
  }
}
function createWindows() {
  let scale = 40;
  mainWindow = new BrowserWindow({
    width: scale * 9,
    height: scale * 16,
    frame: false,
    resizable: false, // 防止用户拖动改变窗口大小
    icon: path.join(__dirname, "favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "modules", "preload.js"),
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
  startDeeplx(); // 启动 deeplx 服务
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
  stopDeeplx();
  globalShortcut.unregisterAll();
});
