# Time signature interactive lesson — build notes

Technical walkthrough of how the standalone HTML time signature lesson was built, covering architecture decisions, the audio engine, visual beat grid, and patterns worth reusing.

---

## Architecture overview

The whole thing is a single self-contained HTML file — no build step, no dependencies beyond Google Fonts. This was intentional: the user wanted something portable they could open offline in any browser.

The stack is just vanilla HTML + CSS + inline SVG + vanilla JS. No frameworks. The interactive metronome is ~120 lines of JS driving two synchronized outputs: a visual beat grid (SVG) and an audio click track (Web Audio API).

### File structure (all in one file)

```
<style>        → all CSS including dark mode, component styles
<div.page>     → static lesson content (headings, paragraphs, callouts)
  <div.metro>  → interactive metronome widget
    buttons    → time signature selectors
    fraction   → big rendered time signature display
    counters   → beat number row (pulses on current beat)
    <svg>      → beat grid visualization
    controls   → play/stop, tempo slider
    legend     → color key
<script>       → all JS: state management, audio engine, drawing, playback loop
```

---

## Audio engine (Web Audio API)

### Why Web Audio API

HTML `<audio>` elements have unpredictable latency (10-50ms depending on browser/OS) which makes them unusable for a metronome. The Web Audio API gives sample-accurate timing because it runs on a separate high-priority audio thread.

### How the click sound works

Each click is a short sine wave oscillator with a fast exponential decay — essentially a "tick" sound. The code creates a fresh oscillator + gain node pair for every beat, which is the standard Web Audio pattern (oscillators are cheap, single-use objects).

```javascript
function beep(accent) {
  const t = ctx.currentTime;           // high-res audio clock
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  
  // Pitch and volume encode beat strength
  // Strong beat: 1200 Hz at 0.6 gain  — high, loud
  // Medium beat:  900 Hz at 0.35 gain — mid
  // Weak beat:    660 Hz at 0.18 gain — low, quiet
  osc.frequency.value = accent === 3 ? 1200 : accent === 2 ? 900 : 660;
  gain.gain.value = accent === 3 ? 0.6 : accent === 2 ? 0.35 : 0.18;
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  // Fast exponential ramp to near-zero over 60ms = sharp click
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  
  osc.start(t);
  osc.stop(t + 0.06);  // auto-cleanup
}
```

### Key details

- **AudioContext must be created from a user gesture** (click/tap). Browser autoplay policies block audio otherwise. That's why `mkCtx()` is called inside `start()`, which fires from the Play button click.
- **`ctx.resume()`** is needed because some browsers (especially mobile Safari) create the context in a `suspended` state even after a gesture.
- **`exponentialRampToValueAtTime`** can't ramp to exactly `0` — use `0.001` as the floor. This is a Web Audio API constraint (log of 0 is undefined).
- The 60ms duration (`t + 0.06`) was chosen by ear — long enough to be audible, short enough to sound like a click rather than a tone.

### Timing

The playback loop uses `setTimeout` rather than Web Audio scheduling. For a teaching metronome this is fine — `setTimeout` jitter is ~1-4ms which is imperceptible at lesson tempos (60-180 bpm). A production metronome for musicians would use `AudioContext.currentTime`-based lookahead scheduling instead (search "Chris Wilson metronome" for that pattern).

```javascript
function tick() {
  if (!on) return;
  
  // Play sound + update visuals for current beat
  beep(accent);
  highlightBeat(currentBeat);
  
  // Calculate interval
  // Quarter note: 60000ms / bpm
  // Eighth note (bot=8): divide by 1.5 to get the faster subdivision
  const ms = B === 8 ? 60000 / bpm / 1.5 : 60000 / bpm;
  
  currentBeat = (currentBeat + 1) % totalBeats;
  timer = setTimeout(tick, ms);
}
```

---

## Visual beat grid (SVG)

### Why SVG over canvas or DOM elements

SVG gives precise control over shape positioning while staying resolution-independent and trivially responsive (`width="100%" viewBox="0 0 680 120"`). Canvas would require manual redraw logic. DOM divs with CSS would fight you on precise alignment. SVG is the sweet spot for this kind of data visualization.

### How beats are drawn

The `draw()` function generates SVG markup dynamically based on the current time signature config:

```javascript
const sigs = {
  '4/4': {
    accents: [3, 1, 2, 1],   // 3=strong, 2=medium, 1=weak
    groups:  [4]               // all 4 beats in one group
  },
  '6/8': {
    accents: [3, 1, 1, 2, 1, 1],  // two groups of 3
    groups:  [3, 3]                 // visual gap between groups
  },
  '5/4': {
    accents: [3, 1, 1, 2, 1],
    groups:  [3, 2]                 // 3+2 grouping
  },
  // ...
};
```

Each beat becomes an SVG `<rect>` whose height and color encode its accent level:

| Accent | Height | Color | Meaning |
|--------|--------|-------|---------|
| 3 (strong) | 76px | `#2E6FBA` (blue) | Downbeat |
| 2 (medium) | 56px | `#85B7EB` (light blue) | Secondary accent |
| 1 (weak) | 40px | `#C4C3BE` (gray) | Weak beat |

The bars align at the bottom (all share the same baseline at y=96), so taller = stronger is immediately intuitive.

### Beat grouping

For compound and odd meters, the `groups` array controls visual spacing. When rendering, a small extra gap (3px) is inserted between groups:

```javascript
// After drawing each beat, check if we've completed a group
groupCount++;
if (groupCount >= groups[groupIndex] && groupIndex < groups.length - 1) {
  x += beatWidth + 3;    // extra 3px gap between groups
  groupIndex++;
  groupCount = 0;
} else {
  x += beatWidth;         // normal spacing within group
}
```

This makes 6/8 visually read as "3 + 3" and 7/8 as "2 + 2 + 3" without needing labels — the spatial grouping communicates it.

### Two measures

The grid always renders 2 measures side by side with a thin bar line between them. This helps the user see the repeating pattern. The bar line is just an SVG `<line>` with low opacity.

### Playback highlighting

During playback, the current beat gets `opacity: 1` and a slight Y-scale bump via a CSS class (`.hit`). The beat number counters above the grid also pulse — the current one gets scaled up 1.25x and turns the accent color.

---

## Dark mode

CSS custom properties handle the entire theme:

```css
:root {
  --bg: #FAF9F6;
  --text: #1A1A18;
  --accent: #2E6FBA;
  /* ... */
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1A1A18;
    --text: #E8E6E0;
    --accent: #5B9AE0;
    /* ... */
  }
}
```

The beat colors in the SVG are hardcoded hex (they represent data, not theme), so they don't invert. Text and UI chrome adapt automatically.

---

## Typography

Two fonts from Google Fonts, loaded via a single `<link>`:

- **DM Serif Display** — for headings, the time signature fraction, and beat counter numbers. Gives the page an editorial, textbook feel.
- **DM Sans** — for body text and UI elements. Clean and legible.

The font loading is the only external dependency. If offline without cached fonts, the browser falls back to `Georgia` and `system-ui` respectively (specified in the font stacks).

---

## Patterns worth reusing

1. **Data-driven SVG generation** — define your visual config as a plain object, write a single `draw()` function that generates markup from it. Much more maintainable than hand-positioning SVG elements.

2. **Web Audio click synthesis** — sine oscillator + exponential decay is the simplest possible percussive sound. Swap `sine` for `triangle` or `square` for different timbres. Raise frequency for a woodblock feel, lower for a bass drum feel.

3. **Accent encoding via height + color** — using two visual channels (size AND color) for the same data makes it readable at a glance. If you only used color, colorblind users would struggle. If you only used height, it's ambiguous without a legend.

4. **setTimeout loop with cleanup** — store the timer ID, clear it on stop, null-check `on` at the top of `tick()`. This prevents zombie timers when the user rapidly toggles play/stop.

5. **Single-file portability** — inline all CSS and JS, use only CDN fonts (graceful fallback), no bundler. The file works by double-clicking it in Finder. This is underrated for tools/demos you want to share with non-technical people.

---

## What I'd improve for production

- **Lookahead audio scheduling** — replace `setTimeout` with a Web Audio scheduler that queues clicks 100ms ahead using `osc.start(futureTime)`. Eliminates all jitter.
- **Visual metronome animation** — a pendulum or bouncing ball that moves continuously between beats, not just discrete highlights.
- **Tap tempo** — let users tap a button to set BPM by averaging inter-tap intervals.
- **Custom groupings** — let users define their own accent patterns for odd meters (e.g., 7/8 as 3+2+2 vs 2+2+3).
- **Sound options** — wood block, rimshot, hi-hat samples via `AudioBuffer` instead of synthesized sine waves.
