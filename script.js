document.addEventListener("DOMContentLoaded", () => {

    // =========================
    // CONFIG
    // =========================

    const LAT = 54.78;   // Smithers BC
    const LON = -127.17;

    const SHEET_URL = "https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnSszKZ74Et4qboFG4re8OcGMBEDuoCAQNp5tiqK0D5OlzTpg6-Z3SSattT-QQzLSajod0MV5jrqCA-iyxSmUsoblx8iDnmcllUS_w7-sDgFbv8E38Blui6QW-Guwnz8K-0nK4Pi-EepY5v5Nk7vlrI47yR9Iwxxq5wengH0j2dAacROJJiqlZotp7mjsLk2kzU5mkDZVAacjR_L-RrF0jfhjk_MXPj5fbGm1z-jaeRKMT6eIvxxntwek_GEb75G5CsrazFzjSdEbLOi6CBAuWQWbDz1fw&lib=MhBR2Q_zMXNN2jGQMqYpNvkjSQG5xV6OM";

    let foodChartInstance = null;

    // =========================
    // DASHBOARD TOGGLE
    // =========================

    const dashboardBtn = document.getElementById("dashboardButton");
    const dashboard = document.getElementById("dashboard");

    if (dashboardBtn && dashboard) {
        dashboardBtn.addEventListener("click", () => {
            dashboard.classList.toggle("hidden");
        });
    }

    // =========================
    // WEATHER
    // =========================

    async function loadWeather() {
        try {
            const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code`
            );

            const data = await res.json();

            const temp = data?.current?.temperature_2m;
            const code = data?.current?.weather_code;

            const text = weatherText(code);

            const smallWeather = document.getElementById("weather");
            const dashWeather = document.getElementById("weatherDetails");

            if (smallWeather) {
                smallWeather.textContent = `${temp}°C · ${text}`;
            }

            if (dashWeather) {
                dashWeather.textContent = `${temp}°C · ${text}`;
            }

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

    // =========================
    // GOOGLE SHEETS DATA
    // =========================

    async function loadEventData() {
        try {
            const res = await fetch(SHEET_URL);
            const data = await res.json();

            const attendees = data?.totalPeople ?? 0;

            const smallAtt = document.getElementById("attendees");
            const dashAtt = document.getElementById("attendanceNumber");

            if (smallAtt) smallAtt.textContent = attendees;
            if (dashAtt) dashAtt.textContent = attendees;

            if (data?.foodCategories) {
                renderFoodChart(data.foodCategories);
            }

        } catch (err) {
            console.error("Sheet load error:", err);
        }
    }

    // =========================
    // CHART.JS
    // =========================

    function renderFoodChart(foodData) {

        const ctx = document.getElementById("foodChart");
        if (!ctx) return;

        const labels = Object.keys(foodData || {});
        const values = Object.values(foodData || {});

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
            }
        });
    }

    // =========================
    // COUNTDOWN
    // =========================

    function updateCountdown() {
        const eventDate = new Date("2026-07-01T11:30:00");
        const now = new Date();

        const diff = eventDate - now;

        const small = document.getElementById("countdown");
        const large = document.getElementById("countdownLarge");

        if (diff <= 0) {
            if (small) small.textContent = "LIVE";
            if (large) large.textContent = "LIVE";
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (small) small.textContent = `${days}d`;
        if (large) large.textContent = `${days} days`;
    }

    // =========================
    // INIT
    // =========================

    loadWeather();
    loadEventData();
    updateCountdown();

    setInterval(updateCountdown, 60000);
    setInterval(loadEventData, 60000); // optional live refresh

});
