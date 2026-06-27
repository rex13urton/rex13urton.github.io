const LAT = 54.78;
const LON = -127.17;

// ---------------- WEATHER ----------------
async function loadWeather() {
    try {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code`
        );

        const data = await res.json();

        const temp = data.current.temperature_2m;
        const code = data.current.weather_code;
        const text = weatherText(code);

        document.getElementById("weather").textContent = text;
        document.getElementById("weatherDetails").textContent = text;

    } catch (err) {
        console.error("Weather error:", err);
    }
}

function weatherText(code) {
    if (code === 0) return "Clear ☀️";
    if (code <= 3) return "Cloudy 🌤";
    if (code <= 48) return "Fog 🌫";
    if (code <= 67) return "Rain 🌧";
    if (code <= 77) return "Snow ❄️";
    return "Mixed";
}

// ---------------- SHEET DATA ----------------
const SHEET_URL = "https://script.google.com/macros/s/AKfycbyroBwB9b7G6UDzxv4_WB3meRRmPuiL8VSJHTNIuDdk07UL5vsPKEnaeoiGY3ZXvTwdHA/exec";

async function loadEventData() {
    try {
        const res = await fetch(SHEET_URL);
        const data = await res.json();

        const total = data.totalPeople || 0;

        document.getElementById("attendees").textContent = total;
        document.getElementById("attendanceNumber").textContent = total;

        renderFoodChart(data.foodCategories || {});
    } catch (err) {
        console.error("Sheet error:", err);
    }
}

// ---------------- CHART ----------------
let foodChartInstance = null;

function renderFoodChart(foodData) {
    const ctx = document.getElementById("foodChart");
    if (!ctx) return;

    const labels = Object.keys(foodData);
    const values = Object.values(foodData);

    const colors = [
        "#C65D25", // Ember Orange
        "#B87333", // Copper
        "#F4E8D1", // Cream
        "#2B2B2B", // Ash
        "#D07A3A", // warm variation (soft orange)
        "#A66A3A", // darker copper variant
        "#E6D6B8", // muted cream variant
        "#8C4A22"  // deep ember accent
    ];

    if (foodChartInstance) foodChartInstance.destroy();

    foodChartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map((_, i) => colors[i % colors.length]),
                borderColor: "#171717",
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#F4E8D1",
                        font: { family: "Inter", size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: "#2B2B2B",
                    titleColor: "#F4E8D1",
                    bodyColor: "#F4E8D1"
                }
            }
        }
    });
}

// ---------------- COUNTDOWN ----------------
function updateCountdown() {
    const eventDate = new Date("2026-07-01T11:30:00");
    const now = new Date();

    const diff = eventDate - now;

    if (diff <= 0) {
        document.getElementById("countdown").textContent = "LIVE";
        document.getElementById("countdownLarge").textContent = "LIVE";
        return;
    }

    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    document.getElementById("countdown").textContent = `${days}d ${hours}h`;
    document.getElementById("countdownLarge").textContent =
        `${days} days ${hours} hrs ${minutes} min`;
}

// ---------------- INIT (ONLY ONCE) ----------------
window.addEventListener("DOMContentLoaded", () => {

    loadWeather();
    loadEventData();
    updateCountdown();

    setInterval(updateCountdown, 60000);

    const btn = document.getElementById("dashboardButton");

    if (btn) {
        btn.addEventListener("click", () => {
            document.getElementById("dashboard").classList.toggle("hidden");

            // optional: refresh chart when opened
            if (!document.getElementById("dashboard").classList.contains("hidden")) {
                loadEventData();
            }
        });
    }

    // ---------------- LIGHTBOX (NOW SAFE) ----------------
    const galleryImages = document.querySelectorAll(".gallery-img");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightboxImg");

    galleryImages.forEach(img => {
        img.addEventListener("click", () => {
            lightboxImg.src = img.src;
            lightbox.classList.remove("hidden");
        });
    });

    if (lightbox) {
        lightbox.addEventListener("click", () => {
            lightbox.classList.add("hidden");
        });
    }
});
