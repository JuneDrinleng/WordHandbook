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
          beginAtZero: true,
          suggestedMax: 100,
          ticks: { callback: (v) => `${v} kWh` },
        },
      },
    },
  });
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
  } catch (e) {
    console.error("读取电量失败", e);
  }
}

/* ====== 启动 ====== */
document.addEventListener("DOMContentLoaded", () => {
  createChart();
  refresh();
  setInterval(refresh, 5000); // 5 秒刷新一次；可自行调整
});
