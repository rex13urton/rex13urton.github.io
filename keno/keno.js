console.log("Rex's Keno Dashboard JS loaded ✅");


// ============================================================
// STATE
// ============================================================

const STATE = {

    // --------------------------------------------------------
    // ALL DRAW DATA
    //
    // Loaded from:
    // stats/draws.json
    //
    // Expected format:
    //
    // {
    //     draw_number: 3379021,
    //     draw_datetime: "2026-01-01T03:42:30",
    //     multiplier: 1.0,
    //     numbers: [1, 10, 11, ...]
    // }
    // --------------------------------------------------------

    draws: [],

    // Draws currently inside selected analysis window
    filteredDraws: [],

    // Most recent draw in dataset
    latestDraw: null,

    // Global filter
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

    highlight: "#C97548",

    cold: "#DCCFBE"

};


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Initializing dashboard..."
        );

        initAnalysisWindow();

        initModal();

        loadData();

    }
);


// ============================================================
// LOAD DATA
// ============================================================

async function loadData() {

    try {

        console.log(
            "Loading draw data..."
        );


        // ----------------------------------------------------
        // LOAD ACTUAL DRAW HISTORY
        //
        // Cache-busting prevents GitHub Pages/browser cache
        // from serving an old version of draws.json.
        // ----------------------------------------------------

        const drawsRes =
            await fetch(
                `stats/draws.json?v=${Date.now()}`,
                {
                    cache: "no-store"
                }
            );


        if (!drawsRes.ok) {

            throw new Error(
                `draws.json failed: ${drawsRes.status}`
            );

        }


        const draws =
            await drawsRes.json();


        // ----------------------------------------------------
        // VALIDATE DATA
        // ----------------------------------------------------

        if (
            !Array.isArray(draws)
        ) {

            throw new Error(
                "draws.json must contain an array of draw records"
            );

        }


        // ----------------------------------------------------
        // NORMALIZE DRAWS
        // ----------------------------------------------------

        STATE.draws =
            draws
                .map(
                    normalizeDraw
                )
                .filter(
                    draw =>
                        draw !== null
                );


        // ----------------------------------------------------
        // SORT OLDEST → NEWEST
        // ----------------------------------------------------

        STATE.draws.sort(
            (
                a,
                b
            ) =>
                a.datetime.getTime() -
                b.datetime.getTime()
        );


        // ----------------------------------------------------
        // LATEST DRAW
        // ----------------------------------------------------

        STATE.latestDraw =
            STATE.draws.length > 0
                ? STATE.draws[
                    STATE.draws.length - 1
                ]
                : null;


        console.log(
            "✅ Draw data loaded"
        );


        console.log(
            "Total raw records:",
            draws.length
        );


        console.log(
            "Valid normalized draws:",
            STATE.draws.length
        );


        console.log(
            "Latest draw:",
            STATE.latestDraw
        );


        // ----------------------------------------------------
        // INITIAL FILTER
        // ----------------------------------------------------

        applyAnalysisFilter();


        // ----------------------------------------------------
        // RENDER DASHBOARD
        // ----------------------------------------------------

        renderDashboard();


    } catch (error) {

        console.error(
            "❌ Failed to load dashboard data:",
            error
        );


        setText(
            "analysisWindowLabel",
            "Unable to load dashboard data"
        );

    }

}


// ============================================================
// NORMALIZE DRAW
// ============================================================

function normalizeDraw(
    raw
) {

    if (
        !raw
    ) {

        return null;

    }


    // --------------------------------------------------------
    // DRAW NUMBER
    // --------------------------------------------------------

    const drawNumber =
        Number(
            raw.draw_number ??
            raw.drawNumber
        );


    // --------------------------------------------------------
    // DATE / TIME
    // --------------------------------------------------------

    const datetimeValue =
        raw.draw_datetime ??
        raw.datetime;


    const datetime =
        new Date(
            datetimeValue
        );


    // --------------------------------------------------------
    // NUMBERS
    // --------------------------------------------------------

    let numbers = [];


    // --------------------------------------------------------
    // ARRAY FORMAT
    // --------------------------------------------------------

    if (
        Array.isArray(
            raw.numbers
        )
    ) {

        numbers =
            raw.numbers
                .map(Number)
                .filter(
                    number =>
                        Number.isInteger(number) &&
                        number >= 1 &&
                        number <= 80
                );

    }


    // --------------------------------------------------------
    // n1 - n20 FORMAT
    // --------------------------------------------------------

    else {

        for (
            let i = 1;
            i <= 20;
            i++
        ) {

            const value =
                raw[
                    `n${i}`
                ];


            if (
                value !== undefined &&
                value !== null
            ) {

                const number =
                    Number(
                        value
                    );


                if (
                    Number.isInteger(number) &&
                    number >= 1 &&
                    number <= 80
                ) {

                    numbers.push(
                        number
                    );

                }

            }

        }

    }


    // --------------------------------------------------------
    // REMOVE DUPLICATE NUMBERS
    // --------------------------------------------------------

    numbers =
        [
            ...new Set(
                numbers
            )
        ];


    // --------------------------------------------------------
    // VALIDATE
    // --------------------------------------------------------

    if (
        !Number.isFinite(
            drawNumber
        )
    ) {

        return null;

    }


    if (
        isNaN(
            datetime.getTime()
        )
    ) {

        return null;

    }


    if (
        numbers.length === 0
    ) {

        return null;

    }


    // --------------------------------------------------------
    // RETURN NORMALIZED DRAW
    // --------------------------------------------------------

    return {

        drawNumber,

        datetime,

        multiplier:
            Number(
                raw.multiplier ?? 1
            ),

        numbers

    };

}


// ============================================================
// MASTER DASHBOARD RENDER
// ============================================================

function renderDashboard() {

    console.log(
        `Rendering dashboard with ${STATE.filteredDraws.length} draws`
    );


    updateAnalysisWindowUI();

    updatePresetButtons();

    buildHeatmap();

    renderLatestDraw();

    updateDayZeroStatus();

}


// ============================================================
// ANALYSIS WINDOW INITIALIZATION
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


    if (
        !slider
    ) {

        console.warn(
            "⚠️ #daysBackSlider not found"
        );

        return;

    }


    // --------------------------------------------------------
    // INITIAL VALUE
    // --------------------------------------------------------

    STATE.filters.daysBack =
        Number(
            slider.value
        ) || 30;


    // --------------------------------------------------------
    // SLIDER
    // --------------------------------------------------------

    slider.addEventListener(
        "input",
        () => {

            STATE.filters.daysBack =
                Number(
                    slider.value
                );


            applyAnalysisFilter();

            updateAnalysisWindowUI();

            updatePresetButtons();

            buildHeatmap();

        }
    );


    // --------------------------------------------------------
    // PRESET BUTTONS
    // --------------------------------------------------------

    presets.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const days =
                        Number(
                            button.dataset.days
                        );


                    if (
                        !Number.isFinite(
                            days
                        )
                    ) {

                        return;

                    }


                    STATE.filters.daysBack =
                        days;


                    slider.value =
                        days;


                    applyAnalysisFilter();

                    updateAnalysisWindowUI();

                    updatePresetButtons();

                    buildHeatmap();

                }
            );

        }
    );


    // --------------------------------------------------------
    // INITIAL UI
    // --------------------------------------------------------

    updateAnalysisWindowUI();

    updatePresetButtons();

}


// ============================================================
// APPLY ANALYSIS FILTER
// ============================================================

function applyAnalysisFilter() {

    if (
        STATE.draws.length === 0 ||
        !STATE.latestDraw
    ) {

        STATE.filteredDraws =
            [];

        return;

    }


    // --------------------------------------------------------
    // LATEST DRAW DATE
    //
    // The analysis window is anchored to the latest
    // available draw in the dataset.
    //
    // 1 Day
    // = latest draw date + previous 1 calendar day
    //
    // 30 Days
    // = latest draw date + previous 30 calendar days
    //
    // Day 0 is always included because the latest draw
    // is the anchor point.
    // --------------------------------------------------------

    const latestDate =
        STATE.latestDraw.datetime;


    const startDate =
        new Date(
            latestDate
        );


    startDate.setDate(
        startDate.getDate() -
        STATE.filters.daysBack
    );


    STATE.filteredDraws =
        STATE.draws.filter(
            draw =>
                draw.datetime >=
                startDate &&
                draw.datetime <=
                latestDate
        );


    console.log(
        "Analysis window:",
        startDate,
        "→",
        latestDate
    );


    console.log(
        "Filtered draws:",
        STATE.filteredDraws.length
    );

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


    // --------------------------------------------------------
    // SLIDER VALUE
    // --------------------------------------------------------

    if (
        value
    ) {

        value.textContent =
            `${days} ${days === 1 ? "Day" : "Days"}`;

    }


    // --------------------------------------------------------
    // DESCRIPTION
    // --------------------------------------------------------

    if (
        label
    ) {

        label.textContent =
            `Analysis Window: Day 0 + previous ${days} ${days === 1 ? "day" : "days"}`;

    }

}


// ============================================================
// UPDATE PRESET BUTTONS
// ============================================================

function updatePresetButtons() {

    const buttons =
        document.querySelectorAll(
            ".analysis-preset"
        );


    buttons.forEach(
        button => {

            const buttonDays =
                Number(
                    button.dataset.days
                );


            button.classList.toggle(
                "active",
                buttonDays ===
                STATE.filters.daysBack
            );

        }
    );

}


// ============================================================
// BUILD HEATMAP
// ============================================================

function buildHeatmap() {

    const container =
        document.getElementById(
            "heatmap"
        );


    if (
        !container
    ) {

        return;

    }


    container.innerHTML =
        "";


    // --------------------------------------------------------
    // COUNT NUMBERS
    // --------------------------------------------------------

    const counts =
        getNumberFrequencyCounts();


    // --------------------------------------------------------
    // FIND MIN / MAX
    // --------------------------------------------------------

    const values =
        Object.values(
            counts
        );


    const minCount =
        Math.min(
            ...values
        );


    const maxCount =
        Math.max(
            ...values
        );


    // --------------------------------------------------------
    // LATEST DRAW
    // --------------------------------------------------------

    const latestNumbers =
        getLatestDrawNumbers();


    // --------------------------------------------------------
    // CREATE BOARD
    // --------------------------------------------------------

    for (
        let number = 1;
        number <= 80;
        number++
    ) {

        const count =
            counts[number];


        let intensity =
            0.5;


        if (
            maxCount !==
            minCount
        ) {

            intensity =
                (
                    count -
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


        // ----------------------------------------------------
        // HEATMAP COLOR
        // ----------------------------------------------------

        const color =
            lerpColor3(
                PALETTE.cold,
                PALETTE.bg,
                PALETTE.highlight,
                intensity
            );


        // ----------------------------------------------------
        // CREATE CELL
        // ----------------------------------------------------

        const cell =
            document.createElement(
                "button"
            );


        cell.type =
            "button";


        cell.className =
            "heat-cell";


        cell.dataset.number =
            number;


        cell.textContent =
            String(
                number
            ).padStart(
                2,
                "0"
            );


        // ----------------------------------------------------
        // COLOR
        // ----------------------------------------------------

        cell.style.backgroundColor =
            color;


        cell.style.color =
            getTextColorFromRGB(
                color
            );


        // ----------------------------------------------------
        // LATEST DRAW HIGHLIGHT
        // ----------------------------------------------------

        const appearedLatest =
            latestNumbers.includes(
                number
            );


        if (
            appearedLatest
        ) {

            cell.classList.add(
                "latest-draw"
            );

        }


        // ----------------------------------------------------
        // TOOLTIP
        // ----------------------------------------------------

        cell.title =
            `Number ${number} • ${count} occurrences` +
            (
                appearedLatest
                    ? " • Latest draw"
                    : ""
            );


        // ----------------------------------------------------
        // CLICK
        // ----------------------------------------------------

        cell.addEventListener(
            "click",
            () => {

                openNumberModal(
                    number
                );

            }
        );


        // ----------------------------------------------------
        // ADD TO BOARD
        // ----------------------------------------------------

        container.appendChild(
            cell
        );

    }

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


    return [
        ...STATE.latestDraw.numbers
    ];

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


    // --------------------------------------------------------
    // CLOSE BUTTON
    // --------------------------------------------------------

    if (
        closeButton
    ) {

        closeButton.addEventListener(
            "click",
            closeNumberModal
        );

    }


    // --------------------------------------------------------
    // CLICK OUTSIDE
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // ESCAPE KEY
    // --------------------------------------------------------

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


    if (
        !modal
    ) {

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
    // ANALYSIS WINDOW
    // --------------------------------------------------------

    setText(
        "modalAnalysisWindow",
        `Analysis Window: Day 0 + previous ${STATE.filters.daysBack} ${STATE.filters.daysBack === 1 ? "day" : "days"}`
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
    // GAP STATISTICS
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
    // SHOW MODAL
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


    if (
        !modal
    ) {

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
// CALCULATE NUMBER STATISTICS
// ============================================================

function calculateNumberStats(
    number
) {

    const draws =
        STATE.filteredDraws;


    const totalDraws =
        draws.length;


    // --------------------------------------------------------
    // OCCURRENCES
    // --------------------------------------------------------

    const occurrences =
        draws.filter(
            draw =>
                draw.numbers.includes(
                    number
                )
        ).length;


    // --------------------------------------------------------
    // FREQUENCY
    // --------------------------------------------------------

    const frequency =
        totalDraws > 0
            ? (
                occurrences /
                totalDraws
            ) * 100
            : 0;


    // --------------------------------------------------------
    // EXPECTED FREQUENCY
    //
    // Each draw contains 20 numbers from 80.
    //
    // The theoretical probability of a specific number
    // appearing in a draw is:
    //
    // 20 / 80 = 25%
    // --------------------------------------------------------

    const expectedProbability =
        20 / 80;


    const expectedOccurrences =
        totalDraws *
        expectedProbability;


    // --------------------------------------------------------
    // FREQUENCY RATIO
    // --------------------------------------------------------

    const frequencyRatio =
        expectedOccurrences > 0
            ? (
                occurrences /
                expectedOccurrences
            ).toFixed(2) + "x"
            : "—";


    // --------------------------------------------------------
    // GAP ANALYSIS
    //
    // Draws are ordered oldest → newest.
    // --------------------------------------------------------

    const hitIndexes =
        [];


    draws.forEach(
        (
            draw,
            index
        ) => {

            if (
                draw.numbers.includes(
                    number
                )
            ) {

                hitIndexes.push(
                    index
                );

            }

        }
    );


    // --------------------------------------------------------
    // BETWEEN-HIT GAPS
    //
    // Example:
    //
    // Hit draw index 5
    // Hit draw index 8
    //
    // Gap = 8 - 5 - 1 = 2 draws
    // --------------------------------------------------------

    const gaps =
        [];


    for (
        let i = 1;
        i < hitIndexes.length;
        i++
    ) {

        gaps.push(
            hitIndexes[i] -
            hitIndexes[i - 1] -
            1
        );

    }


    // --------------------------------------------------------
    // MEAN GAP
    // --------------------------------------------------------

    const meanGap =
        gaps.length > 0
            ? average(
                gaps
            ).toFixed(
                1
            )
            : "—";


    // --------------------------------------------------------
    // MEDIAN GAP
    // --------------------------------------------------------

    const medianGap =
        gaps.length > 0
            ? median(
                gaps
            )
            : "—";


    // --------------------------------------------------------
    // MODE GAP
    // --------------------------------------------------------

    const modeGap =
        gaps.length > 0
            ? mode(
                gaps
            )
            : "—";


    // --------------------------------------------------------
    // CURRENT GAP
    //
    // Number of draws since the most recent appearance.
    //
    // If the latest draw contains the number:
    // Current Gap = 0
    // --------------------------------------------------------

    let currentGap =
        "—";


    if (
        hitIndexes.length > 0
    ) {

        currentGap =
            (
                draws.length -
                1 -
                hitIndexes[
                    hitIndexes.length - 1
                ]
            );

    }


    return {

        occurrences,

        frequency:
            `${frequency.toFixed(2)}%`,

        expectedFrequency:
            expectedOccurrences.toFixed(
                1
            ),

        frequencyRatio,

        meanGap,

        medianGap,

        modeGap,

        currentGap

    };

}


// ============================================================
// RENDER LATEST DRAW
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

        if (
            meta
        ) {

            meta.textContent =
                "Latest draw unavailable";

        }

        return;

    }


    const draw =
        STATE.latestDraw;


    // --------------------------------------------------------
    // DATE / TIME
    // --------------------------------------------------------

    const date =
        draw.datetime.toLocaleDateString();


    const time =
        draw.datetime.toLocaleTimeString(
            [],
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit"
            }
        );


    // --------------------------------------------------------
    // DRAW META
    // --------------------------------------------------------

    if (
        meta
    ) {

        meta.innerHTML = `

            <strong>
                Draw #${draw.drawNumber}
            </strong>

            <span>
                ${date}
            </span>

            <span>
                ${time}
            </span>

            <span>
                x${draw.multiplier}
            </span>

        `;

    }


    // --------------------------------------------------------
    // DRAW NUMBERS
    // --------------------------------------------------------

    if (
        numbersContainer
    ) {

        numbersContainer.innerHTML =
            "";


        // ----------------------------------------------------
        // USE SAME HEATMAP COLORS
        // ----------------------------------------------------

        const counts =
            getNumberFrequencyCounts();


        const values =
            Object.values(
                counts
            );


        const minCount =
            Math.min(
                ...values
            );


        const maxCount =
            Math.max(
                ...values
            );


        draw.numbers.forEach(
            number => {

                const count =
                    counts[number];


                let intensity =
                    0.5;


                if (
                    maxCount !==
                    minCount
                ) {

                    intensity =
                        (
                            count -
                            minCount
                        ) /
                        (
                            maxCount -
                            minCount
                        );

                }


                const color =
                    lerpColor3(
                        PALETTE.cold,
                        PALETTE.bg,
                        PALETTE.highlight,
                        intensity
                    );


                const span =
                    document.createElement(
                        "span"
                    );


                span.textContent =
                    String(
                        number
                    ).padStart(
                        2,
                        "0"
                    );


                span.style.backgroundColor =
                    color;


                span.style.color =
                    getTextColorFromRGB(
                        color
                    );


                numbersContainer.appendChild(
                    span
                );

            }
        );

    }

}


// ============================================================
// GET NUMBER FREQUENCY COUNTS
// ============================================================

function getNumberFrequencyCounts() {

    const counts =
        {};


    // --------------------------------------------------------
    // INITIALIZE 1-80
    // --------------------------------------------------------

    for (
        let number = 1;
        number <= 80;
        number++
    ) {

        counts[number] =
            0;

    }


    // --------------------------------------------------------
    // COUNT SELECTED DRAWS
    // --------------------------------------------------------

    STATE.filteredDraws.forEach(
        draw => {

            draw.numbers.forEach(
                number => {

                    counts[number]++;

                }
            );

        }
    );


    return counts;

}


// ============================================================
// DAY ZERO STATUS
// ============================================================

function updateDayZeroStatus() {

    const drawsTodayElement =
        document.getElementById(
            "drawsToday"
        );


    const expectedElement =
        document.getElementById(
            "expectedDrawsToday"
        );


    const progressElement =
        document.getElementById(
            "dayZeroProgress"
        );


    const progressBar =
        document.getElementById(
            "dayZeroProgressBar"
        );


    if (
        !STATE.latestDraw
    ) {

        return;

    }


    // --------------------------------------------------------
    // LATEST DRAW DATE
    // --------------------------------------------------------

    const latestDate =
        STATE.latestDraw.datetime;


    const year =
        latestDate.getFullYear();


    const month =
        latestDate.getMonth();


    const day =
        latestDate.getDate();


    // --------------------------------------------------------
    // COUNT DRAWS ON LATEST DRAW DATE
    // --------------------------------------------------------

    const todayDraws =
        STATE.draws.filter(
            draw => {

                const date =
                    draw.datetime;


                return (

                    date.getFullYear() ===
                    year &&

                    date.getMonth() ===
                    month &&

                    date.getDate() ===
                    day

                );

            }
        ).length;


    // --------------------------------------------------------
    // EXPECTED DRAWS
    //
    // Temporary value.
    //
    // We can later calculate this from the actual
    // Keno draw schedule.
    // --------------------------------------------------------

    const expected =
        412;


    // --------------------------------------------------------
    // UPDATE DRAW COUNT
    // --------------------------------------------------------

    if (
        drawsTodayElement
    ) {

        drawsTodayElement.textContent =
            todayDraws;

    }


    // --------------------------------------------------------
    // UPDATE EXPECTED COUNT
    // --------------------------------------------------------

    if (
        expectedElement
    ) {

        expectedElement.textContent =
            expected;

    }


    // --------------------------------------------------------
    // CALCULATE PROGRESS
    // --------------------------------------------------------

    const percent =
        expected > 0
            ? Math.min(
                100,
                (
                    todayDraws /
                    expected
                ) *
                100
            )
            : 0;


    // --------------------------------------------------------
    // UPDATE PERCENT
    // --------------------------------------------------------

    if (
        progressElement
    ) {

        progressElement.textContent =
            `${percent.toFixed(1)}%`;

    }


    // --------------------------------------------------------
    // UPDATE PROGRESS BAR
    // --------------------------------------------------------

    if (
        progressBar
    ) {

        progressBar.style.width =
            `${percent}%`;

    }

}


// ============================================================
// COLOR INTERPOLATION
// ============================================================

function lerpColor(
    a,
    b,
    t
) {

    const ah =
        parseInt(
            a.replace(
                "#",
                ""
            ),
            16
        );


    const ar =
        ah >> 16;


    const ag =
        (
            ah >> 8
        ) &
        0xff;


    const ab =
        ah &
        0xff;


    const bh =
        parseInt(
            b.replace(
                "#",
                ""
            ),
            16
        );


    const br =
        bh >> 16;


    const bg =
        (
            bh >> 8
        ) &
        0xff;


    const bb =
        bh &
        0xff;


    const rr =
        Math.round(
            ar +
            (
                br -
                ar
            ) *
            t
        );


    const rg =
        Math.round(
            ag +
            (
                bg -
                ag
            ) *
            t
        );


    const rb =
        Math.round(
            ab +
            (
                bb -
                ab
            ) *
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

    if (
        t <= 0.5
    ) {

        return lerpColor(
            c1,
            c2,
            t * 2
        );

    }


    return lerpColor(
        c2,
        c3,
        (
            t -
            0.5
        ) * 2
    );

}


// ============================================================
// GET TEXT COLOR
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
            .map(
                value =>
                    Number(
                        value.trim()
                    )
            );


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
        : "#FFFFFF";

}


// ============================================================
// STATISTICS HELPERS
// ============================================================

function average(
    values
) {

    if (
        values.length === 0
    ) {

        return 0;

    }


    return (
        values.reduce(
            (
                sum,
                value
            ) =>
                sum +
                value,
            0
        ) /
        values.length
    );

}


// ------------------------------------------------------------
// MEDIAN
// ------------------------------------------------------------

function median(
    values
) {

    const sorted =
        [
            ...values
        ].sort(
            (
                a,
                b
            ) =>
                a -
                b
        );


    const middle =
        Math.floor(
            sorted.length /
            2
        );


    if (
        sorted.length %
        2 ===
        0
    ) {

        return (
            sorted[
                middle - 1
            ] +
            sorted[
                middle
            ]
        ) /
        2;

    }


    return sorted[
        middle
    ];

}


// ------------------------------------------------------------
// MODE
// ------------------------------------------------------------

function mode(
    values
) {

    const frequency =
        {};


    values.forEach(
        value => {

            frequency[value] =
                (
                    frequency[value] ||
                    0
                ) + 1;

        }
    );


    let highestCount =
        0;


    let modeValue =
        "—";


    Object.entries(
        frequency
    ).forEach(
        (
            [
                value,
                count
            ]
        ) => {

            if (
                count >
                highestCount
            ) {

                highestCount =
                    count;


                modeValue =
                    Number(
                        value
                    );

            }

        }
    );


    return modeValue;

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
