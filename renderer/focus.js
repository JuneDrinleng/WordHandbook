/*************** 置顶逻辑 ****************/
async function togglePin() {
  const pinned = document.body.classList.toggle("pinned");
  await window.api.setAlwaysOnTop(pinned);
}

/*************** 公共消息对话框 ****************/
const msgDlg = document.getElementById("msgDlg");
const msgText = document.getElementById("msgText");
document.getElementById("msgOk").onclick = () => msgDlg.close();
function showMsg(text) {
  msgText.textContent = text;
  msgDlg.showModal();
}

/*************** 视图切换 ****************/
function switchView(view) {
  // 切换内容区
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  document.getElementById("view-" + view).classList.add("active");

  // 底部按钮高亮
  document
    .querySelectorAll(".bottom-nav button")
    .forEach((b) => b.classList.remove("active"));
  const idx = { start: 0, stats: 1, records: 2 }[view];
  document.querySelectorAll(".bottom-nav button")[idx].classList.add("active");

  if (view === "records") loadRecords();
  if (view === "stats") calcTodayStats();
}

/*************** 开始 / 结束 专注 ****************/
const btn = document.getElementById("toggle");
const taskDlg = document.getElementById("taskDlg");
const taskInput = document.getElementById("taskInput");
const okBtn = document.getElementById("okBtn");
const cancelBtn = document.getElementById("cancelBtn");
cancelBtn.addEventListener("click", () => taskDlg.close());

let startTime = null;
let task = "";

btn.onclick = () => {
  if (!startTime) {
    taskDlg.showModal();
    taskInput.focus();
  } else {
    endFocus();
  }
};

okBtn.addEventListener("click", (e) => {
  e.preventDefault();
  task = taskInput.value.trim();
  if (!task) return;
  startTime = new Date();
  btn.textContent = "结束专注";
  taskDlg.close();
  taskInput.value = "";
});

async function endFocus() {
  const endTime = new Date();
  try {
    await window.api.saveFocus({
      start_time: fmt(startTime),
      end_time: fmt(endTime),
      task,
    });
    showMsg("已记录专注：" + task);
    loadRecords(); // 结束后刷新记录页
  } catch (e) {
    showMsg("记录失败：" + e.message);
  } finally {
    startTime = null;
    task = "";
    btn.textContent = "开始专注";
  }
}

/*************** 记录列表 & 上下文菜单 ****************/
const list = document.getElementById("records-list");
const ctxMenu = document.getElementById("context-menu");
let records = [];
let current = null;

async function loadRecords() {
  list.innerHTML = "加载中…";
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
      li.innerHTML = `<span>${r.task}</span><span>${r.start_time.slice(
        0,
        16
      )} → ${r.end_time.slice(11, 16)}</span>`;
      li.oncontextmenu = (ev) => {
        ev.preventDefault();
        current = r;
        ctxMenu.style.top = ev.pageY + "px";
        ctxMenu.style.left = ev.pageX + "px";
        ctxMenu.style.display = "block";
      };
      list.appendChild(li);
    });
  } catch (e) {
    list.textContent = "加载失败";
    console.error(e);
  }
}

document.addEventListener("click", () => (ctxMenu.style.display = "none"));

/* -- 删除记录 -- */
async function deleteRecord() {
  ctxMenu.style.display = "none";
  if (!current) return;
  try {
    await window.api.deleteFocus(current.id);
    showMsg("已删除");
    loadRecords();
  } catch (e) {
    showMsg("删除失败：" + e.message);
  }
  current = null;
}

/* -- 编辑记录 -- */
const editDlg = document.getElementById("editDlg");
const editInput = document.getElementById("editTask");
document.getElementById("saveEdit").onclick = async (e) => {
  e.preventDefault();
  const newTask = editInput.value.trim();
  if (!newTask) return;
  try {
    await window.api.updateFocus({
      id: current.id,
      task: newTask,
      // 保留原时间
      start_time: current.start_time,
      end_time: current.end_time,
    });
    showMsg("已更新");
    loadRecords();
  } catch (e) {
    showMsg("更新失败：" + e.message);
  }
  editDlg.close();
  current = null;
};
function editRecord() {
  ctxMenu.style.display = "none";
  if (!current) return;
  editInput.value = current.task;
  editDlg.showModal();
}

/*************** 今日统计（占位） ****************/
function calcTodayStats() {
  const today = new Date().toISOString().slice(0, 10);
  const mins = records
    .filter((r) => r.start_time.startsWith(today))
    .reduce((sum, r) => sum + diffMins(r.start_time, r.end_time), 0);
  document.getElementById(
    "today-stats"
  ).textContent = `今天已专注 ${mins} 分钟`;
}

/*************** 工具函数 ****************/
const fmt = (d) => d.toISOString().slice(0, 19).replace("T", " ");
const diffMins = (s, e) => ((new Date(e) - new Date(s)) / 60000) | 0;

/*************** 初始化 ****************/
loadRecords();
