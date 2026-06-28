console.log("Keno JS loaded ✅");

async function loadData() {

    try {

        const [heatmap, zscores, yearly] = await Promise.all([
            fetch("stats/heatmap.json").then(r => r.json()),
            fetch("stats/zscores.json").then(r => r.json()),
            fetch("stats/yearly.json").then(r => r.json())
        ]);

        buildHeatmap(heatmap);
        buildHotCold(zscores);
        buildSummary(heatmap, zscores);
        buildYearlyChart(yearly);

    } catch (err) {
        console.error("Failed to load data:", err);
    }
}

loadData();


// ========================
// HEATMAP
// ========================
function buildHeatmap(data) {

    const container = document.getElementById("heatmap");
    container.innerHTML = "";

    const max = Math.max(...data.map(d => d.count));

    data.forEach(item => {

        const el = document.createElement("div");

        const intensity = item.count / max;

        // BLUE-GREEN GRADIENT (your theme)
        const r = 23;
        const g = Math.floor(61 + intensity * 80);
        const b = Math.floor(70 + intensity * 90);

        el.style.background = `rgb(${r},${g},${b})`;
        el.style.color = intensity > 0.6 ? "#fff" : "#173D46";

        el.textContent = String(item.number).padStart(2, "0");

        container.appendChild(el);
    });
}

// ========================
// HOT / COLD NUMBERS
// ========================
function buildHotCold(zscores) {

    const sortedHigh = [...zscores].sort((a, b) => b.z - a.z).slice(0, 10);
    const sortedLow = [...zscores].sort((a, b) => a.z - b.z).slice(0, 10);

    const hotContainer = document.getElementById("hotNumbers");
    const coldContainer = document.getElementById("coldNumbers");

    hotContainer.innerHTML = `
        <h2>Hot Numbers</h2>
        <div class="numbers">
            ${sortedHigh.map(n => `<span>${n.number}</span>`).join("")}
        </div>
    `;

    coldContainer.innerHTML = `
        <h2>Cold Numbers</h2>
        <div class="numbers">
            ${sortedLow.map(n => `<span>${n.number}</span>`).join("")}
        </div>
    `;
}


// ========================
// SUMMARY CARD
// ========================
function buildSummary(heatmap, zscores) {

    const totalNumbers = heatmap.length;

    const totalObserved = heatmap.reduce((sum, n) => sum + n.count, 0);

    const avgZ = (
        zscores.reduce((sum, n) => sum + n.z, 0) / zscores.length
    ).toFixed(2);

    document.querySelector("#summary ul").innerHTML = `
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
    container.innerHTML = "";

    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    const grouped = {};

    data.forEach(d => {
        grouped[d.year] = (grouped[d.year] || 0) + d.count;
    });

    new Chart(canvas, {
        type: "line",
        data: {
            labels: Object.keys(grouped),
            datasets: [{
                label: "Yearly Frequency",
                data: Object.values(grouped),
                borderColor: "#295863",
                tension: 0.3,
                fill: true
            }]
        }
    });
}
