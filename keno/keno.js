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

    // normalize
    const cleaned = data.map(d => ({
        number: Number(d.number ?? d.num ?? d.n),
        count: Number(d.count ?? d.frequency ?? d.freq ?? 0)
    }));

    // log scaling (THIS FIXES EVERYTHING)
    const logValues = cleaned.map(d => Math.log1p(d.count));

    const maxLog = Math.max(...logValues, 1);
    const minLog = Math.min(...logValues);

    cleaned.forEach((item, i) => {

        const logVal = Math.log1p(item.count);

        // normalized 0–1 using log space
        const intensity = (logVal - minLog) / (maxLog - minLog || 1);

        const el = document.createElement("div");

        // 🔥 true heatmap gradient (cold → hot)
        const hue = 190 - intensity * 90; 
        const lightness = 92 - intensity * 55;

        el.className = "heat-cell";

        el.style.backgroundColor = `hsl(${hue}, 70%, ${lightness}%)`;
        el.style.borderRadius = "6px";

        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";

        el.style.cursor = "pointer";
        el.style.fontWeight = "600";

        el.style.color = lightness < 55 ? "#fff" : "#173D46";

        // IMPORTANT: store data for click
        el.dataset.number = item.number;
        el.dataset.count = item.count;
        el.dataset.intensity = intensity.toFixed(3);

        el.textContent = String(item.number).padStart(2, "0");

        // click interaction (NOW WORKS + REAL DATA)
        el.addEventListener("click", () => {

            const z = STATE.zscores.find(z => z.number == item.number)?.z;

            alert(
                `Number: ${item.number}\n` +
                `Count: ${item.count}\n` +
                `Intensity: ${intensity.toFixed(3)}\n` +
                `Z-score: ${z ?? "N/A"}`
            );
        });

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
