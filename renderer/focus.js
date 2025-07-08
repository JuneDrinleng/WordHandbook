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
  if (v === "stats") calcTodayStats(); // 每次进统计页都刷新饼图
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
      start_time: toLocalStr(start),
      end_time: toLocalStr(end),
      task,
    });
    toast("已记录专注：" + task);
    await loadRecords(); // 保存完后立刻刷新列表 & 饼图
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
    } else {
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
    }
  } catch (err) {
    list.textContent = "加载失败";
    console.error(err);
  } finally {
    // 无论成功失败都刷新统计，保证饼图同步
    calcTodayStats();
  }
}
document.addEventListener("click", () => (menu.style.display = "none"));

async function deleteRecord() {
  menu.style.display = "none";
  if (!current) return;
  try {
    await window.api.deleteFocus(current.id);
    toast("已删除");
    await loadRecords();
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
    await loadRecords();
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

/**************** 今日统计 + 饼图 ****************/
let pieChart = null; // 保存 Chart.js 实例，切页可销毁

function calcTodayStats() {
  const todayStr = new Date().toDateString();

  /* 1. 计算今日总分钟 & 按任务聚合 */
  let totalMins = 0;
  const taskMins = {};
  records.forEach((r) => {
    if (parseAny(r.start_time).toDateString() !== todayStr) return;
    const mins = diffMins(r.start_time, r.end_time);
    totalMins += mins;
    taskMins[r.task] = (taskMins[r.task] || 0) + mins;
  });

  document.getElementById(
    "today-stats"
  ).textContent = `今天已专注 ${totalMins} 分钟`;

  /* 2. 绘制 / 更新饼图 */
  const canvas = document.getElementById("taskChart");
  if (!canvas) return; // DOM 尚未渲染
  const ctx = canvas.getContext("2d");

  // 清理旧图
  if (pieChart) {
    pieChart.destroy();
    pieChart = null;
  }

  const labels = Object.keys(taskMins);
  const data = Object.values(taskMins);

  if (!data.length) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data, // Chart.js v4+ 自动配色
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 14, padding: 10 },
        },
      },
    },
  });
}

/**************** 工具函数 ****************/
function toLocalStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function parseAny(str) {
  if (str.includes("T")) return new Date(str); // ISO
  const [d, t] = str.split(" ");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm, ss] = t.split(":").map(Number);
  return new Date(y, m - 1, day, hh, mm, ss || 0);
}
const diffMins = (s, e) => ((parseAny(e) - parseAny(s)) / 60000) | 0;

/**************** 初始化 ****************/
loadRecords();
