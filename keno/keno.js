console.log("Rex's Keno Dashboard JS loaded ✅");


// ============================================================
// STATE
// ============================================================

const STATE = {

    heatmap: [],
    zscores: [],
    yearly: [],
    latestDraw: null,

    // All draw-level records that may be available
    // in the loaded JSON files.
    draws: [],

    filters: {
        daysBack: 30
    }

};


// ============================================================
// PALETTE
// ============================================================

const PALETTE = {

    bg: "#F5EEE2",
    text: "#173D46",
    accent: "#295863",
    highlight: "#C97548"

};


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    initAnalysisWindow();

    initModal();

    loadData();

});


// ============================================================
// LOAD DATA
// ============================================================

async function loadData() {

    try {

        const responses = await Promise.all([

            fetch("stats/heatmap.json"),
            fetch("stats/zscores.json"),
            fetch("stats/yearly.json"),
            fetch("stats/latest.json")

        ]);


        const [
            heatmapRes,
            zscoresRes,
            yearlyRes,
            latestRes
        ] = responses;


        STATE.heatmap = await heatmapRes.json();

        STATE.zscores = await zscoresRes.json();

        STATE.yearly = await yearlyRes.json();


        if (latestRes.ok) {

            const latest = await latestRes.json();

            STATE.latestDraw =
                Array.isArray(latest)
                    ? latest[0]
                    : latest;

        }


        console.log("✅ Dashboard data loaded");

        console.log("Heatmap:", STATE.heatmap);

        console.log("Z-Scores:", STATE.zscores);

        console.log("Yearly:", STATE.yearly);

        console.log("Latest Draw:", STATE.latestDraw);


        renderDashboard();


    } catch (error) {

        console.error(
            "❌ Failed to load dashboard data:",
            error
        );


        const label =
            document.getElementById(
                "analysisWindowLabel"
            );


        if (label) {

            label.textContent =
                "Unable to load dashboard data";

        }

    }

}


// ============================================================
// MASTER RENDER
// ============================================================

function renderDashboard() {

    updateAnalysisWindowUI();

    buildHeatmap();

    renderLatestDraw();

    updateDayZeroStatus();

}


// ============================================================
// ANALYSIS WINDOW
// ============================================================

function initAnalysisWindow() {

    const slider =
        document.getElementById(
            "daysBackSlider"
        );


    const presets =
        document.querySelectorAll(
            ".analysis-preset"
        );


    if (!slider) {

        console.warn(
            "⚠️ daysBackSlider not found"
        );

        return;

    }


    // --------------------------------------------------------
    // SLIDER
    // --------------------------------------------------------

    slider.addEventListener(
        "input",
        () => {

            STATE.filters.daysBack =
                Number(slider.value);


            updateAnalysisWindow();

        }
    );


    // --------------------------------------------------------
    // PRESET BUTTONS
    // --------------------------------------------------------

    presets.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const days =
                    Number(
                        button.dataset.days
                    );


                STATE.filters.daysBack =
                    days;


                slider.value =
                    days;


                updateAnalysisWindow();

            }
        );

    });


    // Initial state

    STATE.filters.daysBack =
        Number(slider.value);


    updateAnalysisWindow();

}


// ============================================================
// UPDATE ANALYSIS WINDOW
// ============================================================

function updateAnalysisWindow() {

    updateAnalysisWindowUI();

    updatePresetButtons();

    renderDashboard();

}


// ============================================================
// UPDATE ANALYSIS WINDOW UI
// ============================================================

function updateAnalysisWindowUI() {

    const days =
        STATE.filters.daysBack;


    const value =
        document.getElementById(
            "daysBackValue"
        );


    const label =
        document.getElementById(
            "analysisWindowLabel"
        );


    if (value) {

        value.textContent =
            `${days} ${days === 1 ? "Day" : "Days"}`;

    }


    if (label) {

        if (days === 1) {

            label.textContent =
                "Analysis Window: Day 0 + today's results";

        } else {

            label.textContent =
                `Analysis Window: Day 0 + previous ${days} days`;

        }

    }

}


// ============================================================
// PRESET BUTTON STATE
// ============================================================

function updatePresetButtons() {

    const buttons =
        document.querySelectorAll(
            ".analysis-preset"
        );


    buttons.forEach(button => {

        const buttonDays =
            Number(
                button.dataset.days
            );


        button.classList.toggle(
            "active",
            buttonDays ===
            STATE.filters.daysBack
        );

    });

}


// ============================================================
// DATE HELPERS
// ============================================================

function getRecordDate(record) {

    if (!record) return null;


    const possibleDates = [

        record.datetime,

        record.draw_datetime,

        record.date,

        record.drawDate,

        record.draw_date,

        record.timestamp

    ];


    for (const value of possibleDates) {

        if (!value) continue;


        const date =
            new Date(value);


        if (!isNaN(date.getTime())) {

            return date;

        }

    }


    return null;

}


// ============================================================
// GET ANALYSIS DATE RANGE
// ============================================================

function getAnalysisDateRange() {

    const end =
        new Date();


    end.setHours(
        23,
        59,
        59,
        999
    );


    const start =
        new Date(end);


    start.setDate(
        start.getDate() -
        STATE.filters.daysBack
    );


    start.setHours(
        0,
        0,
        0,
        0
    );


    return {

        start,
        end

    };

}


// ============================================================
// FILTER RECORDS BY ANALYSIS WINDOW
// ============================================================

function filterByAnalysisWindow(data) {

    if (!Array.isArray(data)) {

        return [];

    }


    const {
        start,
        end
    } =
        getAnalysisDateRange();


    const datedRecords =
        data.filter(
            record =>
                getRecordDate(record)
        );


    // If records do not contain dates,
    // return the original data.
    //
    // This allows the dashboard to continue
    // working with aggregate JSON files.

    if (
        datedRecords.length === 0
    ) {

        return data;

    }


    return data.filter(record => {

        const date =
            getRecordDate(record);


        if (!date) {

            return false;

        }


        return (
            date >= start &&
            date <= end
        );

    });

}


// ============================================================
// COLOR HELPERS
// ============================================================

function lerpColor(
    a,
    b,
    t
) {

    const ah =
        parseInt(
            a.replace("#", ""),
            16
        );


    const ar =
        ah >> 16;


    const ag =
        (ah >> 8) &
        0xff;


    const ab =
        ah &
        0xff;


    const bh =
        parseInt(
            b.replace("#", ""),
            16
        );


    const br =
        bh >> 16;


    const bg =
        (bh >> 8) &
        0xff;


    const bb =
        bh &
        0xff;


    const rr =
        Math.round(
            ar +
            (br - ar) *
            t
        );


    const rg =
        Math.round(
            ag +
            (bg - ag) *
            t
        );


    const rb =
        Math.round(
            ab +
            (bb - ab) *
            t
        );


    return `rgb(${rr}, ${rg}, ${rb})`;

}


// ============================================================
// THREE COLOR GRADIENT
// ============================================================

function lerpColor3(
    c1,
    c2,
    c3,
    t
) {

    if (t < 0.5) {

        return lerpColor(
            c1,
            c2,
            t / 0.5
        );

    }


    return lerpColor(
        c2,
        c3,
        (t - 0.5) / 0.5
    );

}


// ============================================================
// TEXT COLOR
// ============================================================

function getTextColorFromRGB(
    rgb
) {

    const values =
        rgb
            .replace(
                /rgb\(|\)/g,
                ""
            )
            .split(",")
            .map(Number);


    const [
        r,
        g,
        b
    ] =
        values;


    const luminance =
        (
            0.2126 * r +
            0.7152 * g +
            0.0722 * b
        );


    return luminance > 150
        ? PALETTE.text
        : "#ffffff";

}


// ============================================================
// NUMBER FREQUENCY BOARD
// ============================================================

function buildHeatmap() {

    const container =
        document.getElementById(
            "heatmap"
        );


    if (!container) {

        console.warn(
            "⚠️ #heatmap not found"
        );

        return;

    }


    container.innerHTML = "";


    // --------------------------------------------------------
    // TRY TO FILTER DATA
    // --------------------------------------------------------

    const filtered =
        filterByAnalysisWindow(
            STATE.heatmap
        );


    // --------------------------------------------------------
    // BUILD NUMBER MAP
    // --------------------------------------------------------

    const numberMap =
        {};


    // First create all 80 numbers

    for (
        let number = 1;
        number <= 80;
        number++
    ) {

        numberMap[number] = {

            number,

            count: 0

        };

    }


    // --------------------------------------------------------
    // READ DATA
    // --------------------------------------------------------

    filtered.forEach(record => {

        const number =
            Number(
                record.number ??
                record.num ??
                record.n
            );


        const count =
            Number(
                record.count ??
                record.frequency ??
                0
            );


        if (
            number >= 1 &&
            number <= 80
        ) {

            numberMap[number].count +=
                count;

        }

    });


    const numbers =
        Object.values(
            numberMap
        );


    // --------------------------------------------------------
    // FIND MIN / MAX
    // --------------------------------------------------------

    const counts =
        numbers.map(
            item =>
                item.count
        );


    const minCount =
        Math.min(
            ...counts
        );


    const maxCount =
        Math.max(
            ...counts
        );


    // --------------------------------------------------------
    // LATEST DRAW NUMBERS
    // --------------------------------------------------------

    const latestNumbers =
        getLatestDrawNumbers();


    // --------------------------------------------------------
    // CREATE BOARD
    // --------------------------------------------------------

    numbers.forEach(item => {

        let intensity;


        if (
            maxCount ===
            minCount
        ) {

            intensity = 0.5;

        } else {

            intensity =
                (
                    item.count -
                    minCount
                ) /
                (
                    maxCount -
                    minCount
                );

        }


        intensity =
            Math.max(
                0,
                Math.min(
                    1,
                    intensity
                )
            );


        const color =
            lerpColor3(
                PALETTE.text,
                PALETTE.bg,
                PALETTE.highlight,
                intensity
            );


        const cell =
            document.createElement(
                "button"
            );


        cell.type =
            "button";


        cell.className =
            "heat-cell";


        cell.dataset.number =
            item.number;


        cell.textContent =
            String(
                item.number
            ).padStart(
                2,
                "0"
            );


        cell.style.backgroundColor =
            color;


        cell.style.color =
            getTextColorFromRGB(
                color
            );


        // ----------------------------------------------------
        // LATEST DRAW HIGHLIGHT
        // ----------------------------------------------------

        if (
            latestNumbers.includes(
                item.number
            )
        ) {

            cell.classList.add(
                "latest-draw-number"
            );

            cell.title =
                `Number ${item.number} appeared in the latest draw`;

        } else {

            cell.title =
                `Number ${item.number} • ${item.count} occurrences`;

        }


        // ----------------------------------------------------
        // CLICK
        // ----------------------------------------------------

        cell.addEventListener(
            "click",
            () => {

                openNumberModal(
                    item.number
                );

            }
        );


        container.appendChild(
            cell
        );

    });

}


// ============================================================
// GET LATEST DRAW NUMBERS
// ============================================================

function getLatestDrawNumbers() {

    if (
        !STATE.latestDraw
    ) {

        return [];

    }


    const draw =
        STATE.latestDraw;


    if (
        Array.isArray(
            draw.numbers
        )
    ) {

        return draw.numbers
            .map(Number);

    }


    // Fallback for n1-n20 format

    const numbers = [];


    for (
        let i = 1;
        i <= 20;
        i++
    ) {

        const value =
            draw[`n${i}`];


        if (
            value !== undefined &&
            value !== null
        ) {

            numbers.push(
                Number(value)
            );

        }

    }


    return numbers;

}


// ============================================================
// NUMBER MODAL INITIALIZATION
// ============================================================

function initModal() {

    const modal =
        document.getElementById(
            "numberModal"
        );


    const closeButton =
        document.getElementById(
            "closeNumberModal"
        );


    if (
        !modal
    ) {

        return;

    }


    // Close button

    if (
        closeButton
    ) {

        closeButton.addEventListener(
            "click",
            closeNumberModal
        );

    }


    // Click outside modal

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                closeNumberModal();

            }

        }
    );


    // Escape key

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeNumberModal();

            }

        }
    );

}


// ============================================================
// OPEN NUMBER MODAL
// ============================================================

function openNumberModal(
    number
) {

    const modal =
        document.getElementById(
            "numberModal"
        );


    if (!modal) {

        return;

    }


    const stats =
        calculateNumberStats(
            number
        );


    // --------------------------------------------------------
    // NUMBER
    // --------------------------------------------------------

    setText(
        "modalNumber",
        String(
            number
        ).padStart(
            2,
            "0"
        )
    );


    // --------------------------------------------------------
    // TITLE
    // --------------------------------------------------------

    setText(
        "modalNumberTitle",
        `Number ${number} Details`
    );


    // --------------------------------------------------------
    // WINDOW
    // --------------------------------------------------------

    setText(
        "modalAnalysisWindow",
        `Analysis Window: Day 0 + previous ${STATE.filters.daysBack} days`
    );


    // --------------------------------------------------------
    // FREQUENCY
    // --------------------------------------------------------

    setText(
        "modalOccurrences",
        stats.occurrences
    );


    setText(
        "modalFrequency",
        stats.frequency
    );


    setText(
        "modalExpectedFrequency",
        stats.expectedFrequency
    );


    setText(
        "modalFrequencyRatio",
        stats.frequencyRatio
    );


    // --------------------------------------------------------
    // GAPS
    // --------------------------------------------------------

    setText(
        "modalMeanGap",
        stats.meanGap
    );


    setText(
        "modalMedianGap",
        stats.medianGap
    );


    setText(
        "modalModeGap",
        stats.modeGap
    );


    setText(
        "modalCurrentGap",
        stats.currentGap
    );


    // --------------------------------------------------------
    // SHOW
    // --------------------------------------------------------

    modal.classList.add(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "modal-open"
    );

}


// ============================================================
// CLOSE NUMBER MODAL
// ============================================================

function closeNumberModal() {

    const modal =
        document.getElementById(
            "numberModal"
        );


    if (!modal) {

        return;

    }


    modal.classList.remove(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "modal-open"
    );

}


// ============================================================
// SET TEXT HELPER
// ============================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (
        element
    ) {

        element.textContent =
            value ??
            "—";

    }

}


// ============================================================
// CALCULATE NUMBER STATS
// ============================================================

function calculateNumberStats(
    number
) {

    // --------------------------------------------------------
    // FIND HEATMAP RECORD
    // --------------------------------------------------------

    const heatmapRecord =
        STATE.heatmap.find(
            record =>
                Number(
                    record.number ??
                    record.num ??
                    record.n
                ) ===
                Number(number)
        );


    const occurrences =
        Number(
            heatmapRecord?.count ??
            heatmapRecord?.frequency ??
            0
        );


    // --------------------------------------------------------
    // ESTIMATE DRAW FREQUENCY
    // --------------------------------------------------------

    // Keno draws 20 numbers out of 80.
    // Expected probability per draw = 20 / 80 = 25%.

    const frequency =
        occurrences > 0
            ? `${(
                occurrences /
                Math.max(
                    1,
                    STATE.filters.daysBack
                )
            ).toFixed(2)} / day`
            : "0 / day";


    // --------------------------------------------------------
    // EXPECTED FREQUENCY
    // --------------------------------------------------------

    // This is a basic estimate using
    // 20 numbers selected from 80.

    const expectedFrequency =
        (
            STATE.filters.daysBack *
            0.25
        ).toFixed(2);


    // --------------------------------------------------------
    // FREQUENCY RATIO
    // --------------------------------------------------------

    const ratio =
        expectedFrequency > 0
            ? (
                occurrences /
                expectedFrequency
            ).toFixed(2)
            : "—";


    return {

        occurrences,

        frequency,

        expectedFrequency,

        frequencyRatio:
            ratio === "—"
                ? "—"
                : `${ratio}x`,

        meanGap:
            "—",

        medianGap:
            "—",

        modeGap:
            "—",

        currentGap:
            "—"

    };

}


// ============================================================
// DAY 0 — LATEST DRAW
// ============================================================

function renderLatestDraw() {

    const meta =
        document.getElementById(
            "drawMeta"
        );


    const numbersContainer =
        document.getElementById(
            "drawNumbers"
        );


    if (
        !STATE.latestDraw
    ) {

        if (meta) {

            meta.textContent =
                "Latest draw unavailable";

        }

        return;

    }


    const draw =
        STATE.latestDraw;


    const drawNumber =
        draw.drawNumber ??
        draw.draw_number ??
        "—";


    const datetime =
        draw.datetime ??
        draw.draw_datetime ??
        "";


    const multiplier =
        draw.multiplier ??
        "—";


    let date =
        "—";


    let time =
        "—";


    if (
        datetime
    ) {

        const parsed =
            new Date(
                datetime
            );


        if (
            !isNaN(
                parsed.getTime()
            )
        ) {

            date =
                parsed.toLocaleDateString();


            time =
                parsed.toLocaleTimeString(
                    [],
                    {
                        hour:
                            "2-digit",

                        minute:
                            "2-digit"
                    }
                );

        } else {

            const parts =
                String(
                    datetime
                ).split(
                    " "
                );


            date =
                parts[0] ??
                "—";


            time =
                parts[1] ??
                "—";

        }

    }


    if (meta) {

        meta.innerHTML = `

            <strong>
                Draw #${drawNumber}
            </strong>

            <span>
                ${date}
            </span>

            <span>
                ${time}
            </span>

            <span>
                x${multiplier}
            </span>

        `;

    }


    if (
        numbersContainer
    ) {

        const numbers =
            getLatestDrawNumbers();


        numbersContainer.innerHTML =
            numbers
                .map(
                    number =>
                        `<span>${String(number).padStart(2, "0")}</span>`
                )
                .join("");

    }

}


// ============================================================
// DAY 0 STATUS
// ============================================================

function updateDayZeroStatus() {

    const drawsToday =
        document.getElementById(
            "drawsToday"
        );


    const expectedDraws =
        document.getElementById(
            "expectedDrawsToday"
        );


    const progress =
        document.getElementById(
            "dayZeroProgress"
        );


    const progressBar =
        document.getElementById(
            "dayZeroProgressBar"
        );


    // --------------------------------------------------------
    // Try to determine draws today
    // --------------------------------------------------------

    let todayDraws = null;


    const latest =
        STATE.latestDraw;


    if (
        latest
    ) {

        todayDraws =
            latest.drawsToday ??
            latest.draws_today ??
            null;

    }


    // --------------------------------------------------------
    // Update draws
    // --------------------------------------------------------

    if (
        drawsToday
    ) {

        drawsToday.textContent =
            todayDraws ??
            "—";

    }


    // --------------------------------------------------------
    // Expected draws
    // --------------------------------------------------------

    const expected =
        latest?.expectedDrawsToday ??
        latest?.expected_draws_today ??
        412;


    if (
        expectedDraws
    ) {

        expectedDraws.textContent =
            expected;

    }


    // --------------------------------------------------------
    // Progress
    // --------------------------------------------------------

    if (
        todayDraws !== null &&
        expected > 0
    ) {

        const percent =
            Math.min(
                100,
                (
                    todayDraws /
                    expected
                ) *
                100
            );


        if (
            progress
        ) {

            progress.textContent =
                `${percent.toFixed(1)}%`;

        }


        if (
            progressBar
        ) {

            progressBar.style.width =
                `${percent}%`;

        }

    } else {

        if (
            progress
        ) {

            progress.textContent =
                "—";

        }

    }

}
