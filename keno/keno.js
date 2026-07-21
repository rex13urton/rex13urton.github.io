console.log("Rex's Keno Dashboard JS loaded ✅");


// ============================================================
// STATE
// ============================================================

const STATE = {

    // Loaded JSON data
    heatmap: [],
    zscores: [],
    yearly: [],
    latestDraw: null,

    // Global dashboard filter
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

document.addEventListener("DOMContentLoaded", () => {

    console.log("Initializing dashboard...");

    initAnalysisWindow();

    initModal();

    loadData();

});


// ============================================================
// LOAD DATA
// ============================================================

async function loadData() {

    try {

        const [
            heatmapRes,
            zscoresRes,
            yearlyRes,
            latestRes
        ] = await Promise.all([

            fetch("stats/heatmap.json"),
            fetch("stats/zscores.json"),
            fetch("stats/yearly.json"),
            fetch("stats/latest.json")

        ]);


        // ----------------------------------------------------
        // CHECK RESPONSES
        // ----------------------------------------------------

        if (!heatmapRes.ok) {
            throw new Error(
                `heatmap.json failed: ${heatmapRes.status}`
            );
        }

        if (!zscoresRes.ok) {
            throw new Error(
                `zscores.json failed: ${zscoresRes.status}`
            );
        }

        if (!yearlyRes.ok) {
            throw new Error(
                `yearly.json failed: ${yearlyRes.status}`
            );
        }

        if (!latestRes.ok) {
            throw new Error(
                `latest.json failed: ${latestRes.status}`
            );
        }


        // ----------------------------------------------------
        // PARSE DATA
        // ----------------------------------------------------

        STATE.heatmap =
            await heatmapRes.json();

        STATE.zscores =
            await zscoresRes.json();

        STATE.yearly =
            await yearlyRes.json();

        const latest =
            await latestRes.json();


        // latest.json may be either:
        //
        // [
        //     { ... }
        // ]
        //
        // or
        //
        // {
        //     ...
        // }

        STATE.latestDraw =
            Array.isArray(latest)
                ? latest[0] ?? null
                : latest;


        console.log(
            "✅ Dashboard data loaded"
        );

        console.log(
            "Heatmap:",
            STATE.heatmap
        );

        console.log(
            "Z-Scores:",
            STATE.zscores
        );

        console.log(
            "Yearly:",
            STATE.yearly
        );

        console.log(
            "Latest Draw:",
            STATE.latestDraw
        );


        // ----------------------------------------------------
        // RENDER
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
// MASTER DASHBOARD RENDER
// ============================================================

function renderDashboard() {

    console.log(
        `Rendering dashboard: ${STATE.filters.daysBack} day window`
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


    if (!slider) {

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


            // Update UI immediately
            updateAnalysisWindowUI();

            updatePresetButtons();


            // Rebuild data-dependent sections
            buildHeatmap();

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


                if (
                    !Number.isFinite(days)
                ) {

                    return;

                }


                STATE.filters.daysBack =
                    days;


                slider.value =
                    days;


                updateAnalysisWindowUI();

                updatePresetButtons();

                buildHeatmap();

            }
        );

    });


    // --------------------------------------------------------
    // INITIAL UI
    // --------------------------------------------------------

    updateAnalysisWindowUI();

    updatePresetButtons();

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

    if (value) {

        value.textContent =
            `${days} ${days === 1 ? "Day" : "Days"}`;

    }


    // --------------------------------------------------------
    // DESCRIPTION
    // --------------------------------------------------------

    if (label) {

        if (days === 1) {

            label.textContent =
                "Analysis Window: Day 0 + previous 1 day";

        } else {

            label.textContent =
                `Analysis Window: Day 0 + previous ${days} days`;

        }

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


    // --------------------------------------------------------
    // CLEAR EXISTING BOARD
    // --------------------------------------------------------

    container.innerHTML = "";


    // --------------------------------------------------------
    // BUILD NUMBER MAP
    //
    // Always create all 80 numbers.
    // --------------------------------------------------------

    const numberMap = {};


    for (
        let number = 1;
        number <= 80;
        number++
    ) {

        numberMap[number] = {

            number,

            count: 0,

            zscore: null

        };

    }


    // --------------------------------------------------------
    // READ HEATMAP DATA
    // --------------------------------------------------------

    if (
        Array.isArray(
            STATE.heatmap
        )
    ) {

        STATE.heatmap.forEach(record => {

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
                    record.occurrences ??
                    0
                );


            if (
                number >= 1 &&
                number <= 80 &&
                Number.isFinite(count)
            ) {

                numberMap[number].count =
                    count;

            }

        });

    }


    // --------------------------------------------------------
    // ADD Z-SCORES IF AVAILABLE
    // --------------------------------------------------------

    if (
        Array.isArray(
            STATE.zscores
        )
    ) {

        STATE.zscores.forEach(record => {

            const number =
                Number(
                    record.number ??
                    record.num ??
                    record.n
                );


            const zscore =
                Number(
                    record.zscore ??
                    record.z_score ??
                    record.z
                );


            if (
                number >= 1 &&
                number <= 80 &&
                Number.isFinite(zscore)
            ) {

                numberMap[number].zscore =
                    zscore;

            }

        });

    }


    // --------------------------------------------------------
    // CONVERT TO ARRAY
    // --------------------------------------------------------

    const numbers =
        Object.values(
            numberMap
        );


    // --------------------------------------------------------
    // FIND MIN / MAX FREQUENCY
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
    // LATEST DRAW
    // --------------------------------------------------------

    const latestNumbers =
        getLatestDrawNumbers();


    // --------------------------------------------------------
    // CREATE 80-NUMBER BOARD
    // --------------------------------------------------------

    numbers.forEach(item => {

        let intensity = 0.5;


        if (
            maxCount !==
            minCount
        ) {

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


        // ----------------------------------------------------
        // HOT → NEUTRAL → COLD
        //
        // Low frequency = cold
        // High frequency = hot
        // ----------------------------------------------------

        const color =
            lerpColor3(
                PALETTE.cold,
                PALETTE.bg,
                PALETTE.highlight,
                intensity
            );


        // ----------------------------------------------------
        // CREATE BUTTON
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

        const appearedLatest =
            latestNumbers.includes(
                item.number
            );


        if (
            appearedLatest
        ) {

            // CSS currently expects:
            // .heatmap div.latest-draw
            //
            // So use "latest-draw" here.

            cell.classList.add(
                "latest-draw"
            );


            cell.title =
                `Number ${item.number} • ${item.count} occurrences • Appeared in latest draw`;

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


        // ----------------------------------------------------
        // ADD TO BOARD
        // ----------------------------------------------------

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


    // --------------------------------------------------------
    // ARRAY FORMAT
    // --------------------------------------------------------

    if (
        Array.isArray(
            draw.numbers
        )
    ) {

        return draw.numbers
            .map(Number)
            .filter(
                number =>
                    number >= 1 &&
                    number <= 80
            );

    }


    // --------------------------------------------------------
    // n1 - n20 FORMAT
    // --------------------------------------------------------

    const numbers = [];


    for (
        let i = 1;
        i <= 20;
        i++
    ) {

        const value =
            draw[
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
                number >= 1 &&
                number <= 80
            ) {

                numbers.push(
                    number
                );

            }

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


    if (!modal) {

        console.warn(
            "⚠️ #numberModal not found"
        );

        return;

    }


    // --------------------------------------------------------
    // CLOSE BUTTON
    // --------------------------------------------------------

    if (closeButton) {

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
    // ANALYSIS WINDOW
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
// CALCULATE NUMBER STATISTICS
// ============================================================

function calculateNumberStats(
    number
) {

    // --------------------------------------------------------
    // FIND NUMBER IN HEATMAP
    // --------------------------------------------------------

    const heatmapRecord =
        Array.isArray(
            STATE.heatmap
        )
            ? STATE.heatmap.find(
                record =>
                    Number(
                        record.number ??
                        record.num ??
                        record.n
                    ) ===
                    Number(number)
            )
            : null;


    const occurrences =
        Number(
            heatmapRecord?.count ??
            heatmapRecord?.frequency ??
            heatmapRecord?.occurrences ??
            0
        );


    // --------------------------------------------------------
    // DRAW COUNT
    //
    // The dashboard's analysis window is based on DAYS.
    //
    // Since heatmap.json appears to be aggregate data,
    // this cannot accurately calculate a 30-day frequency
    // unless the JSON itself contains daily records.
    //
    // We therefore display the aggregate occurrence count
    // here and calculate the ratio using expected probability.
    // --------------------------------------------------------

    const expectedProbability =
        20 / 80;


    // --------------------------------------------------------
    // EXPECTED OCCURRENCES
    //
    // This requires the actual number of draws.
    //
    // For now, use the analysis window as a day-based
    // estimate only if we have a daily draw estimate.
    // --------------------------------------------------------

    const expectedDrawsPerDay =
        412;


    const estimatedDraws =
        STATE.filters.daysBack *
        expectedDrawsPerDay;


    const expectedOccurrences =
        estimatedDraws *
        expectedProbability;


    // --------------------------------------------------------
    // FREQUENCY RATIO
    // --------------------------------------------------------

    let frequencyRatio =
        "—";


    if (
        expectedOccurrences > 0 &&
        occurrences > 0
    ) {

        frequencyRatio =
            `${(
                occurrences /
                expectedOccurrences
            ).toFixed(2)}x`;

    }


    return {

        occurrences:
            occurrences || 0,

        frequency:
            occurrences > 0
                ? `${occurrences} occurrences`
                : "0 occurrences",

        expectedFrequency:
            expectedOccurrences > 0
                ? expectedOccurrences.toFixed(1)
                : "—",

        frequencyRatio,

        // These require draw-level historical
        // data to calculate correctly.
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

        if (meta) {

            meta.textContent =
                "Latest draw unavailable";

        }


        return;

    }


    const draw =
        STATE.latestDraw;


    // --------------------------------------------------------
    // DRAW NUMBER
    // --------------------------------------------------------

    const drawNumber =
        draw.drawNumber ??
        draw.draw_number ??
        "—";


    // --------------------------------------------------------
    // DATE / TIME
    // --------------------------------------------------------

    const datetime =
        draw.datetime ??
        draw.draw_datetime ??
        "";


    // --------------------------------------------------------
    // MULTIPLIER
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // DRAW META
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // DRAW NUMBERS
    // --------------------------------------------------------

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
    // FIND TODAY'S DRAW COUNT
    // --------------------------------------------------------

    const latest =
        STATE.latestDraw;


    let todayDraws =
        latest?.drawsToday ??
        latest?.draws_today ??
        latest?.todayDraws ??
        latest?.today_draws ??
        null;


    // --------------------------------------------------------
    // EXPECTED DRAWS
    // --------------------------------------------------------

    const expected =
        Number(
            latest?.expectedDrawsToday ??
            latest?.expected_draws_today ??
            412
        );


    // --------------------------------------------------------
    // DRAW COUNT
    // --------------------------------------------------------

    if (
        drawsToday
    ) {

        drawsToday.textContent =
            todayDraws !== null
                ? todayDraws
                : "—";

    }


    // --------------------------------------------------------
    // EXPECTED COUNT
    // --------------------------------------------------------

    if (
        expectedDraws
    ) {

        expectedDraws.textContent =
            expected;

    }


    // --------------------------------------------------------
    // PROGRESS
    // --------------------------------------------------------

    if (
        todayDraws !== null &&
        expected > 0
    ) {

        const percent =
            Math.min(
                100,
                (
                    Number(todayDraws) /
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


        if (
            progressBar
        ) {

            progressBar.style.width =
                "0%";

        }

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
            a.replace("#", ""),
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
            b.replace("#", ""),
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
        ) *
        2
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
