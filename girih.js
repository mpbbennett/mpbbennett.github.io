/**
 * Girih-inspired geometric tiling borders.
 *
 * Generates a grid of overlapping decagonal star/rosette motifs
 * drawn as thin gold lines on the left and right edges.
 *
 * On wide canvases (desktop): lines are probabilistically culled
 * based on distance from the edge, so the pattern physically
 * thins out towards the centre.
 *
 * On narrow canvases (mobile, ≤60px): switches to a dense strip
 * of small-scale motifs with no thinning — reads as a textured
 * gold border line.
 */

(function () {
    'use strict';

    const GOLD       = '#c9a84c';
    const GOLD_DIM   = '#6b5326';
    const TAU = Math.PI * 2;
    const SIDES = 10;
    const ANGLE_STEP = TAU / SIDES;

    // Seeded PRNG so pattern is deterministic
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // 10-pointed star with inner decagon and strapwork cross-lines
    function starMotif(cx, cy, outerR, innerR) {
        const lines = [];
        const outerPts = [];
        const innerPts = [];

        for (let i = 0; i < SIDES; i++) {
            const aOuter = ANGLE_STEP * i - Math.PI / 2;
            const aInner = ANGLE_STEP * (i + 0.5) - Math.PI / 2;
            outerPts.push([
                cx + outerR * Math.cos(aOuter),
                cy + outerR * Math.sin(aOuter)
            ]);
            innerPts.push([
                cx + innerR * Math.cos(aInner),
                cy + innerR * Math.sin(aInner)
            ]);
        }

        // Star outline: outer-inner zig-zag
        for (let i = 0; i < SIDES; i++) {
            const next = (i + 1) % SIDES;
            lines.push([outerPts[i][0], outerPts[i][1], innerPts[i][0], innerPts[i][1]]);
            lines.push([innerPts[i][0], innerPts[i][1], outerPts[next][0], outerPts[next][1]]);
        }

        // Inner decagon
        for (let i = 0; i < SIDES; i++) {
            const next = (i + 1) % SIDES;
            lines.push([innerPts[i][0], innerPts[i][1], innerPts[next][0], innerPts[next][1]]);
        }

        // Cross-lines through centre
        for (let i = 0; i < SIDES / 2; i++) {
            const a = outerPts[i];
            const b = outerPts[i + SIDES / 2];
            lines.push([a[0], a[1], b[0], b[1]]);
        }

        return lines;
    }

    function generateLines(canvasW, canvasH, cell) {
        const outerR = cell * 0.48;
        const innerR = cell * 0.28;
        const allLines = [];

        const cols = Math.ceil(canvasW / cell) + 4;
        const rows = Math.ceil(canvasH / (cell * 0.85)) + 4;

        for (let row = -2; row < rows; row++) {
            for (let col = -2; col < cols; col++) {
                const stagger = (row % 2 === 0) ? 0 : cell * 0.5;
                const cx = col * cell + stagger;
                const cy = row * cell * 0.85;
                allLines.push(...starMotif(cx, cy, outerR, innerR));
            }
        }

        return allLines;
    }

    function draw(canvas, side) {
        const dpr = window.devicePixelRatio || 1;
        const docH = document.documentElement.scrollHeight;

        // Clear inline dimensions so CSS media queries take effect
        canvas.style.width = '';
        canvas.style.height = '';

        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = docH;

        if (w < 1) return; // hidden

        // Fully clear the canvas: reset transform first so clearRect
        // covers the entire buffer, then resize.
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.height = h + 'px';
        canvas.style.width = w + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = 'round';

        // ── Narrow mode (mobile): dense strip, no thinning ──
        const narrow = w <= 60;
        const cell = narrow ? 22 : 52;
        const lineWidth = narrow ? 0.5 : 0.7;

        ctx.lineWidth = lineWidth;

        const lines = generateLines(w, h, cell);
        const rand = mulberry32(side === 'left' ? 12345 : 67890);

        for (const seg of lines) {
            const mx = (seg[0] + seg[2]) / 2;

            if (narrow) {
                // Dense strip: keep everything that's within the canvas,
                // just cull a small random fraction for texture
                if (mx < -cell || mx > w + cell) continue;
                if (rand() > 0.85) continue;

                ctx.strokeStyle = GOLD_DIM;
                ctx.globalAlpha = 0.6;
            } else {
                // Wide mode: probabilistic thinning from edge
                let keepProb;
                if (side === 'left') {
                    keepProb = 1 - (mx / w);
                } else {
                    keepProb = mx / w;
                }
                keepProb = Math.pow(Math.max(0, Math.min(1, keepProb)), 1.2);

                if (rand() > keepProb) continue;

                const edgeness = keepProb;
                ctx.strokeStyle = edgeness > 0.5 ? GOLD : GOLD_DIM;
                ctx.globalAlpha = 0.55 + edgeness * 0.35;
            }

            ctx.beginPath();
            ctx.moveTo(seg[0], seg[1]);
            ctx.lineTo(seg[2], seg[3]);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    function setup() {
        draw(document.getElementById('girih-left'), 'left');
        draw(document.getElementById('girih-right'), 'right');
    }

    // Draw once on load. The pattern is decorative — no need to
    // redraw on resize, which avoids all canvas-clearing bugs.
    if (document.readyState === 'complete') {
        setup();
    } else {
        window.addEventListener('load', setup);
    }
})();
