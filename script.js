const LAT = 54.78;   // Smithers BC
const LON = -127.17;

async function loadWeather() {
    const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code`
    );

    const data = await res.json();

    const temp = data.current.temperature_2m;
    const code = data.current.weather_code;

    const text = weatherText(code);

    // small display (hero)
    document.getElementById("weather").textContent =
        `${temp}°C · ${text}`;

    // dashboard display
    document.getElementById("weatherDetails").textContent =
        text;

}

function weatherText(code) {
    if (code === 0) return "Clear ☀️";
    if (code <= 3) return "Cloudy 🌤";
    if (code <= 48) return "Fog 🌫";
    if (code <= 67) return "Rain 🌧";
    if (code <= 77) return "Snow ❄️";
    return "Mixed";
}

const SHEET_URL = "https://script.googleusercontent.com/macros/echo?...";

async function loadEventData() {

    const res = await fetch(SHEET_URL);
    const data = await res.json();

    // 👥 attendees (small + dashboard)
    document.getElementById("attendees").textContent = data.totalPeople;
    document.getElementById("attendanceNumber").textContent = data.totalPeople;

    // 🍔 food chart
    renderFoodChart(data.foodCategories);
}

let foodChartInstance = null;

function renderFoodChart(foodData) {

    const labels = Object.keys(foodData);
    const values = Object.values(foodData);

    const ctx = document.getElementById("foodChart");

    if (foodChartInstance) {
        foodChartInstance.destroy();
    }

    foodChartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                data: values
            }]
        }
    });
}


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

    document.getElementById("countdown").textContent = `${days}d`;
    document.getElementById("countdownLarge").textContent = `${days} days`;
}


loadWeather();
loadEventData();
updateCountdown();

setInterval(updateCountdown, 60000);
