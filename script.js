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
