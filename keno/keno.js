console.log("Keno JS loaded ✅");

let chartInstance = null;

// ========================
// PALETTE (YOUR BRAND)
// ========================
const PALETTE = {
    bg: "#F5EEE2",
    text: "#173D46",
    accent: "#295863",
    highlight: "#C97548"
};

function lerpColor3(c1, c2, c3, t) {

    // 0 → 0.5 → 1 mapping
    if (t < 0.5) {
        return lerpColor(c1, c2, t / 0.5);
    } else {
        return lerpColor(c2, c3, (t - 0.5) / 0.5);
    }
}

function lerpColor(a, b, t) {

    const ah = parseInt(a.replace('#',''),16),
          ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
          bh = parseInt(b.replace('#',''),16),
          br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff;

    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);

    return `rgb(${rr},${rg},${rb})`;
}

function getTextColorFromHex(hex) {

    const c = hex.replace('#','');
    const r = parseInt(c.substring(0,2),16);
    const g = parseInt(c.substring(2,4),16);
    const b = parseInt(c.substring(4,6),16);

    const luminance = (0.2126*r + 0.7152*g + 0.0722*b);

    return luminance > 150 ? PALETTE.text : "#ffffff";
}

// ========================
// GLOBAL STATE
// ========================
const STATE = {
    heatmap: [],
    zscores: [],
    yearly: [],
    latestDraw: null,

    filters: {
        yearMin: 2010,
        yearMax: 2026
    }
};

// ========================
// INIT
// ========================
document.addEventListener("DOMContentLoaded", () => {
    loadData();
    initYearSlider();
});

// ========================
// DATA LOAD
// ========================
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
// YEAR SLIDER (FIXED RANGE)
// ========================
function initYearSlider() {

    const min = document.getElementById("yearMin");
    const max = document.getElementById("yearMax");
    const label = document.getElementById("yearLabel");

    if (!min || !max) return;

    function update() {

        let minVal = Number(min.value);
        let maxVal = Number(max.value);

        // prevent crossover
        if (minVal > maxVal) {
            [min.value, max.value] = [max.value, min.value];
            minVal = Number(min.value);
            maxVal = Number(max.value);
        }

        STATE.filters.yearMin = minVal;
        STATE.filters.yearMax = maxVal;

        if (label) {
            label.textContent = `${minVal} – ${maxVal}`;
        }

        renderDashboard();
    }

    min.addEventListener("input", update);
    max.addEventListener("input", update);
}

// ========================
// MASTER RENDER
// ========================
function renderDashboard() {
    buildHeatmap(STATE.heatmap);
    buildHotCold(STATE.zscores);
    buildSummary(STATE.heatmap);
    buildYearlyChart(STATE.yearly);
    renderLatestDraw(STATE.latestDraw);
}

// ========================
// TEXT COLOR CONTRAST
// ========================
function getTextColorFromHSL(h, s, l) {

    l /= 100;

    const a = s * Math.min(l, 1 - l) / 100;

    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color);
    };

    const r = f(0), g = f(8), b = f(4);

    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b);

    return luminance > 140 ? PALETTE.text : "#ffffff";
}

// ========================
// HEATMAP (FILTERED)
// ========================
function buildHeatmap(data) {

    const container = document.getElementById("heatmap");
    if (!container) return;

    container.innerHTML = "";

    // ---------- FILTER BY YEAR ----------
    const filtered = data.filter(d => {

        const year =
            d.year ??
            (d.date ? Number(String(d.date).slice(0, 4)) : null);

        if (!year) return true;

        return year >= STATE.filters.yearMin &&
               year <= STATE.filters.yearMax;
    });

    const cleaned = filtered.map(d => ({
        number: Number(d.number ?? d.num ?? d.n),
        count: Number(d.count ?? d.frequency ?? d.freq ?? 0)
    }));

    const logValues = cleaned.map(d => Math.log1p(d.count));
    const maxLog = Math.max(...logValues, 1);
    const minLog = Math.min(...logValues);

    cleaned.forEach(item => {

        const logVal = Math.log1p(item.count);
        let intensity = (logVal - minLog) / (maxLog - minLog || 1);

        // clamp
        intensity = Math.max(0, Math.min(1, intensity));

        const el = document.createElement("div");
        el.className = "heat-cell";

        // ========================
        // COLOR SCALE (IMPORTANT FIX)
        // cold → bg → hot
        // ========================
        const color = lerpColor3(
            PALETTE.text,       // cold (deep teal)
            PALETTE.bg,         // neutral
            PALETTE.highlight,  // hot (orange)
            intensity
        );

        el.style.backgroundColor = color;
        el.style.borderRadius = "8px";

        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";

        el.style.cursor = "pointer";
        el.style.fontWeight = "600";

        el.style.color = getTextColorFromHex(color);

        el.textContent = String(item.number).padStart(2, "0");

        el.onclick = () => {

            const z = STATE.zscores.find(z => z.number == item.number)?.z;

            alert(
                `Number: ${item.number}\n` +
                `Count: ${item.count}\n` +
                `Intensity: ${intensity.toFixed(3)}\n` +
                `Z-score: ${z ?? "N/A"}`
            );
        };

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
                ${hot.map(n => `<span data-number="${n.number}">${n.number}</span>`).join("")}
            </div>
        `;

        hotContainer.querySelectorAll("span").forEach(el => {
            el.onclick = () =>
                showNumberModal(STATE.heatmap.find(x => x.number == el.dataset.number));
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
            el.onclick = () =>
                showNumberModal(STATE.heatmap.find(x => x.number == el.dataset.number));
        });
    }
}

// ========================
// SUMMARY
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
// YEARLY CHART (FILTERED)
// ========================
function buildYearlyChart(data) {

    const container = document.getElementById("frequencyChart");
    if (!container) return;

    container.innerHTML = "";

    const filtered = data.filter(d => {

        const year = d.year ?? null;
        if (!year) return true;

        return year >= STATE.filters.yearMin &&
               year <= STATE.filters.yearMax;
    });

    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    const grouped = {};

    filtered.forEach(d => {
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
                borderColor: PALETTE.accent,
                backgroundColor: "rgba(41,88,99,0.12)",
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
// MODAL
// ========================
function showNumberModal(item) {

    if (!item) return;

    alert(
        `Number ${item.number}\n` +
        `Occurrences: ${item.count}\n` +
        `Z Score: ${item.z ?? "N/A"}`
    );
}
