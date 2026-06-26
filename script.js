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

        document.getElementById("weather").textContent =
            `${text}`;

        document.getElementById("weatherDetails").textContent =
            text;



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

    if (foodChartInstance) {
        foodChartInstance.destroy();
    }

    foodChartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels,
            datasets: [{
                data: values
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom"
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

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

    document.getElementById("countdown").textContent = `${days}d ${hours}h`;
    document.getElementById("countdownLarge").textContent = `${days} days ${hours} hrs`;
}

// ---------------- DASHBOARD TOGGLE ----------------
window.addEventListener("DOMContentLoaded", () => {

    loadWeather();
    loadEventData();
    updateCountdown();

    const btn = document.getElementById("dashboardButton");

    if (btn) {
        btn.addEventListener("click", () => {
            document.getElementById("dashboard").classList.toggle("hidden");
        });
    }

    setInterval(updateCountdown, 60000);
});

// ---------------- INIT ----------------
loadWeather();
loadEventData();
updateCountdown();

setInterval(updateCountdown, 60000);
