console.log("Keno JS loaded ✅");

let chartInstance = null;

// ========================
// INIT
// ========================
document.addEventListener("DOMContentLoaded", loadData);

async function loadData() {

    try {
        const [heatmapRes, zscoresRes, yearlyRes] = await Promise.all([
            fetch("stats/heatmap.json"),
            fetch("stats/zscores.json"),
            fetch("stats/yearly.json")
        ]);

        const heatmap = await heatmapRes.json();
        const zscores = await zscoresRes.json();
        const yearly = await yearlyRes.json();

        console.log("DATA LOADED", { heatmap, zscores, yearly });

        renderDashboard(heatmap, zscores, yearly);

        await loadLatestDraw();

    } catch (err) {
        console.error("❌ Failed to load dashboard data:", err);
    }
}

// ========================
// DASHBOARD
// ========================
function renderDashboard(heatmap, zscores, yearly) {

    buildHeatmap(heatmap);
    buildHotCold(zscores);
    buildSummary(heatmap, zscores);
    buildYearlyChart(yearly);
}

// ========================
// HEATMAP (ROBUST + FIXED GRADIENT)
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

        // smooth teal heat scale
        const lightness = 90 - intensity * 55;

        el.style.background = `hsl(190, 45%, ${lightness}%)`;
        el.style.borderRadius = "6px";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";

        el.style.color = lightness < 55 ? "#fff" : "#173D46";

        el.textContent = String(item.number).padStart(2, "0");

        el.title = `Number ${item.number} → ${count.toLocaleString()}`;

        container.appendChild(el);
    });
}

// ========================
// HOT / COLD
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
                ${hot.map(n => `<span>${n.number}</span>`).join("")}
            </div>
        `;
    }

    if (coldContainer) {
        coldContainer.innerHTML = `
            <h2>Cold Numbers</h2>
            <div class="numbers">
                ${cold.map(n => `<span>${n.number}</span>`).join("")}
            </div>
        `;
    }
}

// ========================
// SUMMARY
// ========================
function buildSummary(heatmap, zscores) {

    const summary = document.querySelector("#summary ul");
    if (!summary) return;

    const totalNumbers = heatmap.length;
    const totalObserved = heatmap.reduce((s, n) => s + (n.count || 0), 0);
    const avgZ = (zscores.reduce((s, n) => s + n.z, 0) / zscores.length).toFixed(2);

    summary.innerHTML = `
        <li>Numbers Tracked <strong>${totalNumbers}</strong></li>
        <li>Total Observations <strong>${totalObserved.toLocaleString()}</strong></li>
        <li>Avg Z Score <strong>${avgZ}</strong></li>
        <li>Status <strong>Live Dataset</strong></li>
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
        const year = d.year || "Unknown";
        grouped[year] = (grouped[year] || 0) + (d.count || 0);
    });

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels: Object.keys(grouped),
            datasets: [{
                label: "Keno Frequency by Year",
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
// LATEST DRAW (FIXED FOR YOUR JSON)
// ========================
async function loadLatestDraw() {

    try {
        const res = await fetch("stats/latest.json");

        if (!res.ok) throw new Error("latest.json not found");

        const latest = await res.json();

        console.log("LATEST RAW:", latest);

        const draw = latest?.[0];

        if (!draw) throw new Error("No draw found in latest.json");

        renderLatestDraw(draw);

    } catch (err) {
        console.error("❌ Latest draw failed:", err);
    }
}

// ========================
// RENDER LAST DRAW
// ========================
function renderLatestDraw(draw) {

    const meta = document.getElementById("drawMeta");
    const numbers = document.getElementById("drawNumbers");

    if (!meta || !numbers) return;

    const datetime = draw.datetime || "";
    const [date, time] = datetime.split(" ");

    meta.innerHTML = `
        <strong>Draw #${draw.drawNumber ?? "?"}</strong><br>
        ${date || "?"} • ${time || "?"} • x${draw.multiplier ?? "?"}
    `;

    numbers.innerHTML = (draw.numbers || [])
        .map(n => `<span>${String(n).padStart(2, "0")}</span>`)
        .join("");
}
