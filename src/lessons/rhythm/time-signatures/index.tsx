"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";

/* ── time-signature data ── */
const SIGS: Record<
  string,
  { m: string; d: string; a: number[]; g: number[] }
> = {
  "4/4": {
    m: "4 quarter-note beats per measure",
    d: "The default pulse of pop, rock, hip-hop, and most Western music.",
    a: [3, 1, 2, 1],
    g: [4],
  },
  "3/4": {
    m: "3 quarter-note beats per measure",
    d: "Waltz time — a lilting ONE-two-three cycle.",
    a: [3, 1, 1],
    g: [3],
  },
  "6/8": {
    m: "6 eighth-note beats per measure",
    d: "Compound duple — feels like 2 big swaying beats, each split into 3.",
    a: [3, 1, 1, 2, 1, 1],
    g: [3, 3],
  },
  "2/4": {
    m: "2 quarter-note beats per measure",
    d: "March time — LEFT-right, LEFT-right.",
    a: [3, 1],
    g: [2],
  },
  "5/4": {
    m: "5 quarter-note beats per measure",
    d: 'Odd meter, usually 3+2. Think "Take Five" by Dave Brubeck.',
    a: [3, 1, 1, 2, 1],
    g: [3, 2],
  },
  "7/8": {
    m: "7 eighth-note beats per measure",
    d: "Asymmetric groove (2+2+3) — Balkan folk, prog rock.",
    a: [3, 1, 2, 1, 3, 1, 1],
    g: [2, 2, 3],
  },
};

const SIG_KEYS = ["4/4", "3/4", "6/8", "2/4", "5/4", "7/8"] as const;

const COLORS = { strong: "#2E6FBA", medium: "#85B7EB", weak: "#C4C3BE" };
const HEIGHTS = { strong: 76, medium: 56, weak: 40 };

function accentColor(a: number) {
  return a === 3 ? COLORS.strong : a === 2 ? COLORS.medium : COLORS.weak;
}
function accentHeight(a: number) {
  return a === 3 ? HEIGHTS.strong : a === 2 ? HEIGHTS.medium : HEIGHTS.weak;
}

/* ── component ── */
export default function TimeSignaturesLesson() {
  const [sig, setSig] = useState("4/4");
  const [bpm, setBpm] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [activeBeat, setActiveBeat] = useState(-1);

  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(false);
  const beatRef = useRef(0);
  const bpmRef = useRef(bpm);
  const sigRef = useRef(sig);

  // keep refs in sync
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);
  useEffect(() => {
    sigRef.current = sig;
  }, [sig]);

  const data = SIGS[sig];
  const T = parseInt(sig.split("/")[0]);
  const B = parseInt(sig.split("/")[1]);
  const totalBeats = T * 2; // 2 measures

  /* ── audio ── */
  function ensureCtx() {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
  }

  function beep(acc: number) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = acc === 3 ? 1200 : acc === 2 ? 900 : 660;
    g.gain.value = acc === 3 ? 0.6 : acc === 2 ? 0.35 : 0.18;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.start(t);
    o.stop(t + 0.06);
  }

  /* ── tick loop ── */
  const tick = useCallback(() => {
    if (!playingRef.current) return;
    const curSig = sigRef.current;
    const s = SIGS[curSig];
    const curT = parseInt(curSig.split("/")[0]);
    const curB = parseInt(curSig.split("/")[1]);
    const tot = curT * 2;
    const bim = beatRef.current % curT;
    const acc = s.a[bim];

    setActiveBeat(beatRef.current % tot);
    beep(acc);

    const curBpm = bpmRef.current;
    const ms = curB === 8 ? 60000 / curBpm / 1.5 : 60000 / curBpm;
    beatRef.current = (beatRef.current + 1) % tot;
    timerRef.current = setTimeout(tick, ms);
  }, []);

  function start() {
    ensureCtx();
    playingRef.current = true;
    setPlaying(true);
    beatRef.current = 0;
    tick();
  }

  function stop() {
    playingRef.current = false;
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveBeat(-1);
  }

  function toggle() {
    playing ? stop() : start();
  }

  function pickSig(key: string) {
    if (playing) stop();
    setSig(key);
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      playingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /* ── SVG beat grid ── */
  function buildGrid() {
    const s = SIGS[sig];
    const n = T;
    const mes = 2;
    const usable = 636;
    const mg = 24;
    const iw = (usable - (mes - 1) * mg) / mes;
    const bw = iw / n;
    const gp = 4;

    const elements: React.ReactNode[] = [];
    let x = 22;

    for (let m = 0; m < mes; m++) {
      let gi = 0;
      let gc = 0;
      for (let i = 0; i < n; i++) {
        const idx = m * n + i;
        const a = s.a[i];
        const col = accentColor(a);
        const bh = accentHeight(a);
        const y = 96 - bh;
        const isActive = idx === activeBeat;

        elements.push(
          <g key={`bar-${idx}`}>
            <rect
              x={x}
              y={y}
              width={bw - gp}
              height={bh}
              rx={4}
              fill={col}
              opacity={isActive ? 1 : 0.5}
              style={{
                transition: "opacity 0.06s, transform 0.06s",
                transformOrigin: "center bottom",
              }}
            />
            <text
              x={x + (bw - gp) / 2}
              y={110}
              textAnchor="middle"
              style={{ fontSize: "11px", fill: "var(--text2, #6B6A65)" }}
            >
              {i + 1}
            </text>
          </g>
        );

        gc++;
        if (gc >= s.g[gi] && gi < s.g.length - 1) {
          x += bw + 3;
          gi++;
          gc = 0;
        } else {
          x += bw;
        }
      }

      if (m < mes - 1) {
        elements.push(
          <line
            key={`barline-${m}`}
            x1={x + 4}
            y1={10}
            x2={x + 4}
            y2={96}
            stroke="var(--text3, #9C9B96)"
            strokeWidth={1.5}
            opacity={0.3}
          />
        );
        x += mg;
      }
    }

    return elements;
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 py-12">
      {/* Back link */}
      <Link
        href="/rhythm"
        className="text-sm hover:text-[var(--accent)] transition-colors"
        style={{ color: "var(--text3)" }}
      >
        &larr; Rhythm
      </Link>

      {/* Title */}
      <h1
        className="font-serif font-normal leading-tight mt-4 mb-1"
        style={{
          fontSize: "clamp(2rem, 5vw, 3rem)",
          letterSpacing: "-0.02em",
        }}
      >
        Time signatures
      </h1>
      <p className="text-[1.05rem] mb-10" style={{ color: "var(--text2)" }}>
        An interactive guide to how rhythm is organized in music.
      </p>

      {/* What is a time signature? */}
      <h2
        className="font-serif font-normal text-2xl mt-10 mb-4"
        style={{ letterSpacing: "-0.01em" }}
      >
        What is a time signature?
      </h2>
      <p className="text-[0.95rem] mb-4" style={{ color: "var(--text)" }}>
        A time signature is the pair of stacked numbers you see at the start of
        a piece of sheet music. It answers two questions:{" "}
        <strong>how many beats</strong> are in each measure, and{" "}
        <strong>what kind of note</strong> gets one beat.
      </p>

      {/* Callout */}
      <div
        className="rounded-r-[10px] py-4 px-5 my-6 text-[0.92rem]"
        style={{
          background: "var(--accent-light)",
          borderLeft: "3px solid var(--accent)",
          color: "var(--text)",
        }}
      >
        <strong className="font-semibold">Top number</strong> = how many beats
        per measure.
        <br />
        <strong className="font-semibold">Bottom number</strong> = which note
        value equals one beat (4 = quarter note, 8 = eighth note).
      </div>

      <p className="text-[0.95rem] mb-4" style={{ color: "var(--text)" }}>
        So <strong>3/4</strong> means &ldquo;three quarter-note beats per
        measure&rdquo; — that&rsquo;s waltz time. <strong>6/8</strong> means
        &ldquo;six eighth-note beats,&rdquo; but those six are usually felt as
        two big groups of three, giving it a swaying, compound feel.
      </p>

      {/* Strong and weak beats */}
      <h2
        className="font-serif font-normal text-2xl mt-10 mb-4"
        style={{ letterSpacing: "-0.01em" }}
      >
        Strong and weak beats
      </h2>
      <p className="text-[0.95rem] mb-4" style={{ color: "var(--text)" }}>
        Not all beats are created equal. The first beat of every measure (the{" "}
        <strong>downbeat</strong>) is the strongest — it&rsquo;s where your foot
        lands hardest. Other beats are weaker, creating a recurring pattern of
        emphasis that defines the groove. A march (2/4) feels completely
        different from a waltz (3/4) because their accent patterns differ, even
        at the same tempo.
      </p>

      {/* Try it yourself */}
      <h2
        className="font-serif font-normal text-2xl mt-10 mb-4"
        style={{ letterSpacing: "-0.01em" }}
      >
        Try it yourself
      </h2>
      <p className="text-[0.95rem] mb-4" style={{ color: "var(--text2)" }}>
        Pick a time signature, hit play, and listen to how the accent pattern
        changes. Adjust tempo to feel it at different speeds.
      </p>

      {/* ===== Interactive Metronome Card ===== */}
      <div
        className="rounded-2xl p-7 my-8"
        style={{ background: "var(--bg2)" }}
      >
        {/* Signature selector buttons */}
        <div className="flex flex-wrap gap-2 mb-5">
          {SIG_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => pickSig(key)}
              className="px-[15px] py-[7px] rounded-[10px] text-[0.85rem] font-medium cursor-pointer select-none transition-all duration-150"
              style={{
                fontFamily: "var(--font-sans, system-ui, sans-serif)",
                border:
                  sig === key
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border)",
                background: sig === key ? "var(--accent)" : "var(--bg)",
                color: sig === key ? "#fff" : "var(--text)",
              }}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Signature header: fraction + info */}
        <div className="flex items-baseline gap-3.5 mb-4">
          <div
            className="font-serif flex flex-col items-center min-w-[44px]"
            style={{ fontSize: "2.6rem", lineHeight: 1 }}
          >
            <span>{T}</span>
            <span
              className="w-[30px] h-[2px] my-[2px]"
              style={{ background: "var(--text)" }}
            />
            <span>{B}</span>
          </div>
          <div>
            <p className="text-[0.95rem] font-medium m-0">{data.m}</p>
            <p
              className="text-[0.82rem] mt-[3px] m-0"
              style={{ color: "var(--text2)" }}
            >
              {data.d}
            </p>
          </div>
        </div>

        {/* Beat counter row */}
        <div className="flex justify-center gap-2 mb-3">
          {Array.from({ length: T }, (_, i) => {
            const isOn = activeBeat >= 0 && activeBeat % T === i;
            return (
              <span
                key={i}
                className="font-serif text-[1.6rem] min-w-[36px] text-center inline-block"
                style={{
                  color: isOn ? "var(--accent)" : "var(--text3)",
                  transform: isOn ? "scale(1.25)" : "scale(1)",
                  transition: "color 0.06s, transform 0.06s",
                }}
              >
                {i + 1}
              </span>
            );
          })}
        </div>

        {/* SVG beat grid */}
        <svg
          width="100%"
          viewBox="0 0 680 120"
          role="img"
          aria-label="Beat visualization"
        >
          <title>Beat visualization</title>
          <desc>Vertical bars representing beat accents</desc>
          {buildGrid()}
        </svg>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={toggle}
            className="px-5 py-2 rounded-[10px] text-[0.85rem] font-semibold border-none cursor-pointer select-none transition-all duration-150"
            style={{
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              background: "var(--accent)",
              color: "#fff",
            }}
          >
            {playing ? "Stop" : "Play"}
          </button>
          <label className="text-[0.8rem]" style={{ color: "var(--text2)" }}>
            Tempo
          </label>
          <input
            type="range"
            min={60}
            max={180}
            step={1}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="flex-1"
            style={{
              WebkitAppearance: "none",
              appearance: "none" as const,
              height: "4px",
              borderRadius: "2px",
              background: "var(--border)",
              outline: "none",
            }}
          />
          <span
            className="text-[0.85rem] min-w-[28px] text-right"
            style={{ color: "var(--text)" }}
          >
            {bpm}
          </span>
          <label className="text-[0.8rem]" style={{ color: "var(--text2)" }}>
            bpm
          </label>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4">
          {[
            { label: "Strong (downbeat)", color: COLORS.strong },
            { label: "Medium", color: COLORS.medium },
            { label: "Weak", color: COLORS.weak },
          ].map(({ label, color }) => (
            <div
              key={label}
              className="flex items-center gap-[5px] text-[0.78rem]"
              style={{ color: "var(--text2)" }}
            >
              <span
                className="w-3 h-3 rounded-[3px] inline-block"
                style={{ background: color }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Common time signatures */}
      <h2
        className="font-serif font-normal text-2xl mt-10 mb-4"
        style={{ letterSpacing: "-0.01em" }}
      >
        Common time signatures
      </h2>
      <p className="text-[0.95rem] mb-4" style={{ color: "var(--text)" }}>
        <strong>4/4 — &ldquo;common time&rdquo;</strong>
        <br />
        Four quarter-note beats. The backbone of rock, pop, funk, hip-hop,
        electronic, and most Western music. If you&rsquo;re tapping your foot to
        a song, odds are it&rsquo;s in 4/4.
      </p>
      <p className="text-[0.95rem] mb-4" style={{ color: "var(--text)" }}>
        <strong>3/4 — waltz time</strong>
        <br />
        Three quarter-note beats: ONE-two-three, ONE-two-three. This gives music
        a lilting, dance-like sway. Think waltzes, many folk songs, and ballads.
      </p>
      <p className="text-[0.95rem] mb-4" style={{ color: "var(--text)" }}>
        <strong>6/8 — compound duple</strong>
        <br />
        Six eighth notes grouped in two sets of three. It feels like two big
        beats, each subdivided into three — creating a rolling, swaying quality.
        Common in Irish jigs, blues, and ballads.
      </p>
      <p className="text-[0.95rem] mb-4" style={{ color: "var(--text)" }}>
        <strong>2/4 — march time</strong>
        <br />
        Two quarter-note beats: LEFT-right, LEFT-right. Simple, driving, and
        forward-moving. Polkas and marches live here.
      </p>

      {/* Odd meters */}
      <h2
        className="font-serif font-normal text-2xl mt-10 mb-4"
        style={{ letterSpacing: "-0.01em" }}
      >
        Odd meters
      </h2>
      <p className="text-[0.95rem] mb-4" style={{ color: "var(--text)" }}>
        Once you leave the comfort of 2, 3, and 4, things get interesting. Odd
        time signatures like 5/4 and 7/8 divide beats into asymmetric groups —
        creating grooves that feel slightly &ldquo;off&rdquo; in the best way.
      </p>
      <p className="text-[0.95rem] mb-4" style={{ color: "var(--text)" }}>
        <strong>5/4</strong> is usually felt as 3+2 or 2+3. Dave Brubeck&rsquo;s
        &ldquo;Take Five&rdquo; is the classic example — that distinctive,
        swinging-but-uneven groove.
      </p>
      <p className="text-[0.95rem] mb-4" style={{ color: "var(--text)" }}>
        <strong>7/8</strong> is often grouped 2+2+3 or 3+2+2. It shows up
        throughout Balkan folk music, progressive rock, and film scores. Once you
        start hearing it, you&rsquo;ll notice it everywhere.
      </p>

      {/* Bottom line callout */}
      <div
        className="rounded-r-[10px] py-4 px-5 my-6 text-[0.92rem]"
        style={{
          background: "var(--accent-light)",
          borderLeft: "3px solid var(--accent)",
          color: "var(--text)",
        }}
      >
        <strong className="font-semibold">The bottom line:</strong> A time
        signature is just a way of telling musicians how to count. The top
        number says how high to count, the bottom number says what you&rsquo;re
        counting. Everything else — the groove, the feel, the swing — comes from
        how musicians interpret that pattern.
      </div>
    </div>
  );
}
