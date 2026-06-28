console.log("Keno JS loaded ✅");

let chartInstance = null; // prevents duplicate charts

// ========================
// LOAD DATA
// ========================
async function loadData() {

    try {

        const [heatmap, zscores, yearly] = await Promise.all([
            fetch("stats/heatmap.json").then(r => r.json()),
            fetch("stats/zscores.json").then(r => r.json()),
            fetch("stats/yearly.json").then(r => r.json())
        ]);

        renderDashboard(heatmap, zscores, yearly);

    } catch (err) {
        console.error("Failed to load data:", err);
    }
}

loadData();


// ========================
// MASTER RENDER
// ========================
function renderDashboard(heatmap, zscores, yearly) {

    buildHeatmap(heatmap);
    buildHotCold(zscores);
    buildSummary(heatmap, zscores);
    buildYearlyChart(yearly);

}


// ========================
// HEATMAP (FIXED + CLEAN)
// ========================
function buildHeatmap(data) {

    const container = document.getElementById("heatmap");

    if (!container) {
        console.warn("Heatmap container missing (#heatmap)");
        return;
    }

    container.innerHTML = "";

    const max = Math.max(...data.map(d => d.count));

    data.forEach(item => {

        const el = document.createElement("div");

        const intensity = item.count / max;

        const r = 23;
        const g = Math.floor(61 + intensity * 90);
        const b = Math.floor(70 + intensity * 110);

        el.style.background = `rgb(${r},${g},${b})`;
        el.style.color = intensity > 0.55 ? "#fff" : "#173D46";

        el.textContent = String(item.number).padStart(2, "0");

        el.title = `#${item.number} → ${item.count.toLocaleString()}`;

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

    const totalNumbers = heatmap.length;
    const totalObserved = heatmap.reduce((s, n) => s + n.count, 0);
    const avgZ = (zscores.reduce((s, n) => s + n.z, 0) / zscores.length).toFixed(2);

    const summary = document.querySelector("#summary ul");

    if (!summary) return;

    summary.innerHTML = `
        <li>Numbers Tracked <strong>${totalNumbers}</strong></li>
        <li>Total Observations <strong>${totalObserved.toLocaleString()}</strong></li>
        <li>Avg Z Score <strong>${avgZ}</strong></li>
        <li>Status <strong>Live Dataset</strong></li>
    `;
}


// ========================
// CHART (FIXED CLEAN)
// ========================
function buildYearlyChart(data) {

    const container = document.getElementById("frequencyChart");

    if (!container) return;

    container.innerHTML = "";

    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    const grouped = {};

    data.forEach(d => {
        grouped[d.year] = (grouped[d.year] || 0) + d.count;
    });

    if (chartInstance) {
        chartInstance.destroy();
    }

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
