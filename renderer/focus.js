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
  if (v === "stats") calcStats(currentScope);
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

/* 新增：直接开始专注（不给弹窗） */
function startFocusDirect(tName) {
  if (start) return; // 已在专注中则忽略
  task = tName.trim();
  if (!task) return;
  start = new Date();
  btn.textContent = "结束专注";
  toast("开始专注：" + task);
}

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

    /* 若 To-Do 中存在同名且未完成的任务 → 划线 */
    const td = todos.find((x) => x.text === task && !x.done);
    if (td) {
      td.done = true;
      saveTodos();
      renderTodos();
    }

    await loadRecords();
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
    calcStats(currentScope);
    updateRecentTasks();
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

/****************  颜色工具  ****************/
function makePalette(n, baseHue = 350) {
  const colors = [];
  for (let i = 0; i < n; i++) {
    const h = (baseHue + (360 / n) * i) % 360;
    colors.push(`hsl(${h}deg 55% 75%)`);
  }
  return colors;
}

/**************** 统计（多粒度饼图） ****************/
let pieChart = null;
let currentScope = "week"; // 默认周视图

function calcStats(scope = "week") {
  currentScope = scope;

  const now = new Date();
  const todayStr = now.toDateString();

  // 周一零点
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  let totalMins = 0;
  const taskMins = {};
  const daysInRange = new Set();

  records.forEach((r) => {
    const st = parseAny(r.start_time);

    const within =
      scope === "day"
        ? st.toDateString() === todayStr
        : scope === "week"
        ? st >= monday
        : scope === "month"
        ? st.getFullYear() === now.getFullYear() &&
          st.getMonth() === now.getMonth()
        : true;

    if (!within) return;

    const mins = diffMins(r.start_time, r.end_time);
    totalMins += mins;
    taskMins[r.task] = (taskMins[r.task] || 0) + mins;
    daysInRange.add(st.toDateString());
  });

  const fmt = (m) => (m >= 60 ? `${(m / 60) | 0}小时${m % 60}分` : `${m}分`);

  const rangeTxt =
    scope === "day"
      ? now.toLocaleDateString()
      : scope === "week"
      ? `${monday.toLocaleDateString()} ~ ${now.toLocaleDateString()}`
      : scope === "month"
      ? now.toLocaleDateString().slice(0, 7)
      : "";

  document.getElementById("date-range").textContent = rangeTxt;

  const avg = daysInRange.size
    ? fmt((totalMins / daysInRange.size) | 0)
    : "0分";
  document.getElementById("summary-line").textContent = `总计 ${fmt(
    totalMins
  )}  日均 ${avg}`;

  const labels = Object.entries(taskMins).map(([t, m]) => `${t}  ${fmt(m)}`);
  const data = Object.values(taskMins);

  const ctx = document.getElementById("taskChart").getContext("2d");
  if (pieChart) pieChart.destroy();

  if (!data.length) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    document.getElementById("chart-legend").innerHTML = "";
    return;
  }

  pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: makePalette(data.length),
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    },
    options: { plugins: { legend: { display: false } } },
  });

  const legendDom = document.getElementById("chart-legend");
  const meta = pieChart.getDatasetMeta(0).data;
  legendDom.innerHTML = data
    .map(
      (m, i) =>
        `<li style="color:${meta[i].options.backgroundColor}">${
          labels[i]
        }&nbsp;&nbsp;${((m / totalMins) * 100).toFixed(1)}%</li>`
    )
    .join("");
}

/* 粒度 Tabs */
document.querySelectorAll(".scope-tabs .tab").forEach((btn) => {
  btn.onclick = () => {
    document.querySelector(".scope-tabs .active")?.classList.remove("active");
    btn.classList.add("active");
    calcStats(btn.dataset.scope);
  };
});

/**************** 最近任务快捷按钮 ****************/
function updateRecentTasks(max = 5) {
  const box = document.getElementById("recent-list");
  if (!box) return;

  const seen = new Set();
  const tasks = [];
  for (let i = records.length - 1; i >= 0 && tasks.length < max; i--) {
    const t = records[i].task;
    if (t && !seen.has(t)) {
      seen.add(t);
      tasks.push(t);
    }
  }

  box.innerHTML = tasks
    .map(
      (t) => `<button class="recent-task-btn" data-task="${t}">${t}</button>`
    )
    .join("");

  box.querySelectorAll(".recent-task-btn").forEach((b) => {
    b.onclick = () => {
      // 仍保持弹窗行为
      inpTask.value = b.dataset.task;
      dlgTask.showModal();
      inpTask.focus();
    };
  });

  document.getElementById("recent-container").style.display = tasks.length
    ? "block"
    : "none";
}

/**************** 今日 To-Do List ****************/
const todoDlg = document.getElementById("todoDlg");
const todoInput = document.getElementById("todoInput");
let todos = [];
const todoKey = "todos-" + new Date().toDateString();

function loadTodos() {
  todos = JSON.parse(localStorage.getItem(todoKey) || "[]");
}
function saveTodos() {
  localStorage.setItem(todoKey, JSON.stringify(todos));
}

function renderTodos() {
  const list = document.getElementById("todo-list");
  if (!list) return;
  list.innerHTML = todos
    .map(
      (t) => `<li class="record-entry todo-item ${
        t.done ? "done" : ""
      }" data-id="${t.id}">
                <span>${t.text}</span>
              </li>`
    )
    .join("");

  list.querySelectorAll(".todo-item").forEach((li) => {
    li.onclick = () => {
      const t = todos.find((x) => x.id === li.dataset.id);
      startFocusDirect(t.text); // 直接进入专注，无弹窗
    };
    li.oncontextmenu = (e) => {
      e.preventDefault();
      const t = todos.find((x) => x.id === li.dataset.id);
      todoInput.value = t.text;
      todoDlg.dataset.editId = t.id;
      todoDlg.showModal();
    };
  });

  document.getElementById("todo-list").style.display = todos.length
    ? "block"
    : "none";
}

/* 添加 / 编辑 To-Do */
document.getElementById("addTodoBtn").onclick = () => {
  delete todoDlg.dataset.editId;
  todoInput.value = "";
  todoDlg.showModal();
  todoInput.focus();
};

document.getElementById("todoOk").onclick = (e) => {
  e.preventDefault();
  const txt = todoInput.value.trim();
  if (!txt) return;
  const editId = todoDlg.dataset.editId;
  if (editId) {
    todos.find((t) => t.id === editId).text = txt;
  } else {
    todos.push({ id: Date.now() + "", text: txt, done: false });
  }
  saveTodos();
  renderTodos();
  todoDlg.close();
};

/**************** 工具函数 ****************/
function toLocalStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
function parseAny(str) {
  if (str.includes("T")) return new Date(str);
  const [d, t] = str.split(" ");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm, ss] = t.split(":").map(Number);
  return new Date(y, m - 1, day, hh, mm, ss || 0);
}
const diffMins = (s, e) => ((parseAny(e) - parseAny(s)) / 60000) | 0;

/**************** 初始化 ****************/
loadTodos();
loadRecords().then(() => {
  calcStats("week");
  updateRecentTasks();
  renderTodos();
});
