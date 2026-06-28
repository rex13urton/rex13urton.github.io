console.log("Keno JS loaded ✅");

let chartInstance = null;

// ========================
// GLOBAL STATE (IMPORTANT FOR FUTURE FILTERS)
// ========================
const STATE = {
    heatmap: [],
    zscores: [],
    yearly: [],
    latestDraw: null
};

// ========================
// INIT
// ========================
document.addEventListener("DOMContentLoaded", loadData);

async function loadData() {

    try {

        const [heatmapRes, zscoresRes, yearlyRes, latestRes] = await Promise.all([
            fetch("stats/heatmap.json"),
            fetch("stats/zscores.json"),
            fetch("stats/yearly.json"),
            fetch("stats/latest.json").catch(() => null)
        ]);

        STATE.heatmap = await heatmapRes.json();
        STATE.zscores = await zscoresRes.json();
        STATE.yearly = await yearlyRes.json();

        if (latestRes && latestRes.ok) {
            const latest = await latestRes.json();
            STATE.latestDraw = latest?.[0] || null;
        }

        renderDashboard();

    } catch (err) {
        console.error("❌ Failed to load dashboard data:", err);
    }
}

// ========================
// MASTER RENDER
// ========================
function renderDashboard() {
    buildHeatmap(STATE.heatmap);
    buildHotCold(STATE.zscores);
    buildSummary(STATE.heatmap, STATE.zscores);
    buildYearlyChart(STATE.yearly);
    renderLatestDraw(STATE.latestDraw);
}

// ========================
// HEATMAP (CLICKABLE + FUTURE READY)
// ========================
function buildHeatmap(data) {

    const container = document.getElementById("heatmap");
    if (!container) return;

    container.innerHTML = "";

    const max = Math.max(...data.map(d => Number(d.count) || 0), 1);

    data.forEach(item => {

        const count = Number(item.count) || 0;
        const intensity = count / max;

        const el = document.createElement("div");

        const lightness = 92 - intensity * 55;

        el.className = "heat-cell";

        el.style.background = `hsl(190, 45%, ${lightness}%)`;
        el.style.color = lightness < 55 ? "#fff" : "#173D46";

        el.textContent = String(item.number).padStart(2, "0");

        // STORE FULL DATA FOR INTERACTIONS
        el.dataset.number = item.number;
        el.dataset.count = count;
        el.dataset.z = item.z ?? 0;

        el.addEventListener("click", () => showNumberModal(item));

        container.appendChild(el);
    });
}

// ========================
// HOT / COLD (CLICKABLE READY)
// ========================
function buildHotCold(zscores) {

    const hot = [...zscores].sort((a, b) => b.z - a.z).slice(0, 10);
    const cold = [...zscores].sort((a, b) => a.z - b.z).slice(0, 10);

    const hotContainer = document.getElementById("hotNumbers");
    const coldContainer = document.getElementById("coldNumbers");

    if (hotContainer) {
        hotContainer.innerHTML = `
            <h2>Hot Numbers</h2>
            <div class="numbers">
                ${hot.map(n => `<span data-number="${n.number}">${n.number}</span>`).join("")}
            </div>
        `;

        hotContainer.querySelectorAll("span").forEach(el => {
            el.onclick = () => showNumberModal(
                STATE.heatmap.find(x => x.number == el.dataset.number)
            );
        });
    }

    if (coldContainer) {
        coldContainer.innerHTML = `
            <h2>Cold Numbers</h2>
            <div class="numbers">
                ${cold.map(n => `<span data-number="${n.number}">${n.number}</span>`).join("")}
            </div>
        `;

        coldContainer.querySelectorAll("span").forEach(el => {
            el.onclick = () => showNumberModal(
                STATE.heatmap.find(x => x.number == el.dataset.number)
            );
        });
    }
}

// ========================
// SUMMARY (NOW USEFUL)
// ========================
function buildSummary(heatmap) {

    const sorted = [...heatmap].sort((a, b) => b.count - a.count);

    const hot = sorted[0];
    const cold = sorted[sorted.length - 1];

    const summary = document.querySelector("#summary ul");
    if (!summary) return;

    summary.innerHTML = `
        <li>🔥 Hot #1 <strong>${hot?.number ?? "-"}</strong></li>
        <li>🧊 Cold #1 <strong>${cold?.number ?? "-"}</strong></li>
        <li>📊 Numbers <strong>${heatmap.length}</strong></li>
        <li>⚡ Status <strong>Live</strong></li>
    `;
}

// ========================
// YEARLY CHART
// ========================
function buildYearlyChart(data) {

    const container = document.getElementById("frequencyChart");
    if (!container) return;

    container.innerHTML = "";

    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    const grouped = {};

    data.forEach(d => {
        const year = d.year ?? "Unknown";
        grouped[year] = (grouped[year] || 0) + (d.count || 0);
    });

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels: Object.keys(grouped),
            datasets: [{
                label: "Frequency",
                data: Object.values(grouped),
                borderColor: "#295863",
                backgroundColor: "rgba(41,88,99,0.15)",
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// ========================
// LAST DRAW
// ========================
function renderLatestDraw(draw) {

    const meta = document.getElementById("drawMeta");
    const numbers = document.getElementById("drawNumbers");

    if (!meta || !numbers || !draw) return;

    const [date, time] = (draw.datetime || "").split(" ");

    meta.innerHTML = `
        <strong>Draw #${draw.drawNumber ?? "-"}</strong><br>
        ${date ?? "?"} • ${time ?? "?"} • x${draw.multiplier ?? "?"}
    `;

    numbers.innerHTML = (draw.numbers || [])
        .map(n => `<span>${String(n).padStart(2, "0")}</span>`)
        .join("");
}

// ========================
// NUMBER MODAL (CORE INTERACTION)
// ========================
function showNumberModal(item) {

    if (!item) return;

    alert(
        `Number ${item.number}\n` +
        `Occurrences: ${item.count}\n` +
        `Z Score: ${item.z ?? "N/A"}`
    );
}
