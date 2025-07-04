/* ====== 颜色映射 ====== */
const mix = (a, b, r) => Math.round(a + (b - a) * r);
const hex2rgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5), 16),
];
const lerpColor = (c1, c2, r) => {
  const [r1, g1, b1] = hex2rgb(c1),
    [r2, g2, b2] = hex2rgb(c2);
  return `rgb(${mix(r1, r2, r)},${mix(g1, g2, r)},${mix(b1, b2, r)})`;
};

function getColor(val) {
  if (val >= 50) return "#11c15b"; // 绿
  if (val <= 15) return "#ff4d4f"; // 红
  return lerpColor("#ff4d4f", "#faad14", (val - 15) / 35); // 红→黄渐变
}

function setRingColor(val) {
  document.documentElement.style.setProperty("--ring", getColor(val));
}

/* ====== Chart 初始 ====== */
let chart;
function createChart() {
  const ctx = document.getElementById("powerChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          tension: 0.25,
          borderWidth: 2,
          pointRadius: 3,
          borderColor: (context) =>
            getColor(context.dataset.data[context.dataIndex]),
          pointBackgroundColor: (context) => getColor(context.raw),
          pointBorderColor: (context) => getColor(context.raw),
          segment: {
            borderColor: (ctx) => getColor(ctx.p1.parsed.y),
          },
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} kWh` } },
      },
      scales: {
        x: { display: false },
        y: {
          beginAtZero: true, // 初始值；刷新时会动态改写
          suggestedMax: 100,
          ticks: { callback: (v) => `${v} kWh` },
        },
      },
    },
  });
}

/* ====== 左右等高 ====== */
function syncChartHeight() {
  const left = document.querySelector(".current-card"); // 仪表+按钮
  const right = document.querySelector(".chart-card");
  if (left && right) {
    right.style.height = left.offsetHeight + "px";
    chart?.resize();
  }
}

/* ====== 拉取本地数据 ====== */
async function refresh() {
  try {
    const bills = await window.api.getBills(); // 直接调用 preload 暴露的方法
    if (!bills.length) return;

    // 时间升序 + 剔除重复电量
    const sorted = [...bills].sort(
      (a, b) => new Date(a.record_time) - new Date(b.record_time)
    );
    const clean = sorted
      .filter((d, i, arr) => i === 0 || d.fee_amount !== arr[i - 1].fee_amount)
      .slice(-5);

    const labels = clean.map((d) =>
      new Date(d.record_time).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    const values = clean.map((d) => Number(d.fee_amount));

    /* ★ 动态计算 Y 轴范围 */
    const yMin = Math.min(...values);
    const yMax = Math.max(...values);
    const pad = (yMax - yMin) * 0.05 || 1; // 5 % 缓冲，若全同值兜底 1

    chart.options.scales.y.beginAtZero = false;
    chart.options.scales.y.suggestedMin = Math.max(0, yMin - pad);
    chart.options.scales.y.suggestedMax = yMax + pad;

    /* 折线图更新 */
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update("none");

    /* 环形 + 数值文本 */
    const latest = sorted.at(-1);
    const v = Number(latest.fee_amount);
    document.getElementById("powerValue").textContent = v.toFixed(2);
    document.getElementById("currentTime").textContent = new Date(
      latest.record_time
    ).toLocaleString(undefined, { hour12: false });
    setRingColor(v);

    /* ★ 同步左右高度 */
    syncChartHeight();
  } catch (e) {
    console.error("读取电量失败", e);
  }
}
/* ====== 每 2 h 自动抓电量 ====== */
async function autoFetchElectricity() {
  try {
    const ret = await window.api.refreshElectricity(); // 调用主进程接口
    if (!ret.ok) throw new Error(ret.error);
    await window.api.addBill(ret.data); // 写入数据库
    await refresh(); // 刷新仪表 & 图表
  } catch (e) {
    console.error("定时抓电费失败", e);
  }
}

/* ====== 手动录入 ====== */
async function saveBill() {
  const tInp = document.getElementById("inp-time");
  const fInp = document.getElementById("inp-fee");
  const msg = document.getElementById("bill-msg");

  if (!tInp || !fInp || !msg) return; // 输入区可能被注释掉

  msg.textContent = "";
  if (!tInp.value || !fInp.value) return (msg.textContent = "❌ 请填写完整！");

  try {
    await window.api.addBill({
      record_time: new Date(tInp.value)
        .toISOString()
        .slice(0, 19)
        .replace("T", " "),
      fee_amount: Number(fInp.value),
    });
    msg.textContent = "✅ 已写入！";
    fInp.value = "";
    refresh(); // 立刻刷新图表
  } catch (e) {
    console.error("写入失败", e);
    msg.textContent = "❌ 写入失败，请检查网络/Token";
  }
}

/* ====== 账号保存（输入框可选） ====== */
(() => {
  const idInp = document.getElementById("stu-id");
  const pwdInp = document.getElementById("stu-pwd");
  const saveBtn = document.getElementById("btn-save-cred");

  if (saveBtn && idInp && pwdInp) {
    saveBtn.addEventListener("click", () => {
      localStorage.setItem("elecUser", idInp.value.trim());
      localStorage.setItem("elecPass", pwdInp.value.trim());
      alert("✔ 学号/密码已保存到本地");
    });
  }
})();

/* ====== 页面启动 ====== */
document.addEventListener("DOMContentLoaded", () => {
  // 回填账号（若仍保留输入框）
  const idInp = document.getElementById("stu-id");
  const pwdInp = document.getElementById("stu-pwd");
  if (idInp) idInp.value = localStorage.getItem("elecUser") || "";
  if (pwdInp) pwdInp.value = localStorage.getItem("elecPass") || "";

  createChart();
  refresh();
  syncChartHeight();
  autoFetchElectricity(); // 首次立即抓
  setInterval(autoFetchElectricity, 7_200_000); // 之后每 2 h 再抓
  setInterval(refresh, 5_000);
  window.addEventListener("resize", syncChartHeight);

  /* 抓电费按钮（可选） */
  const refreshBtn = document.getElementById("btn-refresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;
      try {
        const ret = await window.api.refreshElectricity();
        if (!ret.ok) throw new Error(ret.error);
        // 成功抓数后，由渲染层自己 POST /bills
        await window.api.addBill(ret.data);
        await refresh();
      } catch (e) {
        alert("抓电费失败: " + e.message);
      } finally {
        refreshBtn.disabled = false;
      }
    });
  }
});
