/**************** 置顶逻辑 ****************/
async function togglePin() {
  const pinned = document.body.classList.toggle("pinned");
  await window.api.setAlwaysOnTop(pinned);
}

/**************** 通用消息框 ****************/
const msgDlg = document.getElementById("msgDlg");
const msgTxt = document.getElementById("msgText");
document.getElementById("msgOk").onclick = () => msgDlg.close();
const toast = (t) => {
  msgTxt.textContent = t;
  msgDlg.showModal();
};

/**************** 视图切换 ****************/
function switchView(v) {
  document
    .querySelectorAll(".view")
    .forEach((el) => el.classList.toggle("active", el.id === "view-" + v));
  document
    .querySelectorAll(".bottom-nav button")
    .forEach((b, i) =>
      b.classList.toggle("active", i === { start: 0, stats: 1, records: 2 }[v])
    );
  if (v === "records") loadRecords();
  if (v === "stats") calcTodayStats();
}

/**************** 开始 / 结束专注 ****************/
const btn = document.getElementById("toggle");
const dlgTask = document.getElementById("taskDlg");
const inpTask = document.getElementById("taskInput");
const okBtn = document.getElementById("okBtn");
const cancelBtn = document.getElementById("cancelBtn");
cancelBtn.onclick = () => dlgTask.close();

let start = null,
  task = "";

btn.onclick = () =>
  start ? endFocus() : (dlgTask.showModal(), inpTask.focus());

okBtn.onclick = (e) => {
  e.preventDefault();
  task = inpTask.value.trim();
  if (!task) return;
  start = new Date();
  btn.textContent = "结束专注";
  dlgTask.close();
  inpTask.value = "";
};

async function endFocus() {
  const end = new Date();
  try {
    await window.api.saveFocus({
      start_time: toLocalStr(start), // 本地时间串写库
      end_time: toLocalStr(end),
      task,
    });
    toast("已记录专注：" + task);
    loadRecords();
  } catch (err) {
    toast("记录失败：" + err.message);
  } finally {
    start = null;
    task = "";
    btn.textContent = "开始专注";
  }
}

/**************** 记录列表与右键菜单 ****************/
const list = document.getElementById("records-list");
const menu = document.getElementById("context-menu");
let records = [];
let current = null;

async function loadRecords() {
  list.textContent = "加载中…";
  try {
    records = await window.api.getFocus();
    if (!records.length) {
      list.textContent = "暂无记录";
      return;
    }
    list.innerHTML = "";
    records.forEach((r) => {
      const li = document.createElement("li");
      li.className = "record-entry";
      li.dataset.id = r.id;

      const s = parseAny(r.start_time);
      const e = parseAny(r.end_time);
      const sTxt = s.toLocaleString(undefined, {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const eTxt = e.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });

      li.innerHTML = `<span>${r.task}</span><span>${sTxt} → ${eTxt}</span>`;
      li.oncontextmenu = (ev) => {
        ev.preventDefault();
        current = r;
        Object.assign(menu.style, {
          top: ev.pageY + "px",
          left: ev.pageX + "px",
          display: "block",
        });
      };
      list.appendChild(li);
    });
  } catch (err) {
    list.textContent = "加载失败";
    console.error(err);
  }
}
document.addEventListener("click", () => (menu.style.display = "none"));

async function deleteRecord() {
  menu.style.display = "none";
  if (!current) return;
  try {
    await window.api.deleteFocus(current.id);
    toast("已删除");
    loadRecords();
  } catch (e) {
    toast("删除失败：" + e.message);
  }
  current = null;
}

const dlgEdit = document.getElementById("editDlg");
const inpEdit = document.getElementById("editTask");
document.getElementById("saveEdit").onclick = async (e) => {
  e.preventDefault();
  const newTask = inpEdit.value.trim();
  if (!newTask) return;
  try {
    await window.api.updateFocus({ ...current, task: newTask });
    toast("已更新");
    loadRecords();
  } catch (err) {
    toast("更新失败：" + err.message);
  }
  dlgEdit.close();
  current = null;
};
function editRecord() {
  menu.style.display = "none";
  if (current) {
    inpEdit.value = current.task;
    dlgEdit.showModal();
  }
}

/**************** 今日统计 ****************/
function calcTodayStats() {
  const today = new Date();
  const mins = records.reduce(
    (s, r) =>
      parseAny(r.start_time).toDateString() === today.toDateString()
        ? s + diffMins(r.start_time, r.end_time)
        : s,
    0
  );
  document.getElementById(
    "today-stats"
  ).textContent = `今天已专注 ${mins} 分钟`;
}

/**************** 工具函数 ****************/
/* Date → 本地串 "YYYY-MM-DD HH:mm:ss" */
function toLocalStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/* 兼容 ISO(带T/Z) & 本地串 */
function parseAny(str) {
  if (str.includes("T")) return new Date(str); // 旧记录 ISO
  const [d, t] = str.split(" ");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm, ss] = t.split(":").map(Number);
  return new Date(y, m - 1, day, hh, mm, ss || 0);
}
const diffMins = (s, e) => ((parseAny(e) - parseAny(s)) / 60000) | 0;

/**************** 初始化 ****************/
loadRecords();
