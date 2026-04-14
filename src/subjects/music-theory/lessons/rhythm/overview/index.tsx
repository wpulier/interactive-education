"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const PATTERNS = [
  { name: "Steady pulse", beats: [1, 1, 1, 1], label: "Even quarter notes" },
  { name: "Syncopation", beats: [1, 0, 1, 0.5, 0, 1, 0, 0.5], label: "Off-beat emphasis" },
  { name: "Swing", beats: [1, 0, 0.6, 1, 0, 0.6], label: "Triplet feel" },
];

export default function RhythmOverview() {
  const [playing, setPlaying] = useState(false);
  const [patternIdx, setPatternIdx] = useState(0);
  const [activeBeat, setActiveBeat] = useState(-1);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(false);
  const beatRef = useRef(0);

  const pattern = PATTERNS[patternIdx];

  const beep = useCallback((vol: number) => {
    const ctx = ctxRef.current;
    if (!ctx || vol === 0) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = vol >= 1 ? 880 : 660;
    gain.gain.value = vol * 0.4;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t);
    osc.stop(t + 0.08);
  }, []);

  const tick = useCallback(() => {
    if (!playingRef.current) return;
    const p = PATTERNS[patternIdx];
    const vol = p.beats[beatRef.current % p.beats.length];
    setActiveBeat(beatRef.current % p.beats.length);
    beep(vol);
    beatRef.current = (beatRef.current + 1) % p.beats.length;
    timerRef.current = setTimeout(tick, 200);
  }, [patternIdx, beep]);

  const start = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
    playingRef.current = true;
    setPlaying(true);
    beatRef.current = 0;
    tick();
  }, [tick]);

  const stop = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveBeat(-1);
  }, []);

  useEffect(() => {
    return () => {
      playingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const switchPattern = (idx: number) => {
    if (playing) stop();
    setPatternIdx(idx);
  };

  return (
    <div className="max-w-[720px] mx-auto px-6 py-10">
      <h1
        className="text-4xl mb-1 tracking-tight"
        style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
      >
        What is rhythm?
      </h1>
      <p className="text-[1.05rem] mb-10" style={{ color: "var(--text2)" }}>
        The foundation everything else in music is built on.
      </p>

      <h2
        className="text-2xl mt-10 mb-4"
        style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
      >
        The heartbeat of music
      </h2>
      <p className="text-[0.95rem] mb-4 leading-relaxed">
        Rhythm is the pattern of sounds and silences in time. It&rsquo;s what
        makes you tap your foot, nod your head, or feel the urge to move.
        Strip away melody, strip away harmony — rhythm is what remains. A
        drumbeat alone can make you dance.
      </p>
      <p className="text-[0.95rem] mb-4 leading-relaxed">
        Every piece of music, from a symphony to a hip-hop track, is built on
        a rhythmic foundation. Understanding rhythm means understanding{" "}
        <strong>when</strong> things happen — not what notes are played, but
        how they&rsquo;re placed in time.
      </p>

      <div
        className="rounded-r-lg py-4 px-5 my-6 text-[0.92rem]"
        style={{
          background: "var(--accent-light)",
          borderLeft: "3px solid var(--accent)",
        }}
      >
        <strong>Think of it this way:</strong> If melody is <em>what</em> you
        sing, rhythm is <em>when</em> you sing it. The same melody played
        with different rhythms becomes a completely different piece of music.
      </div>

      <h2
        className="text-2xl mt-10 mb-4"
        style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
      >
        The building blocks
      </h2>
      <p className="text-[0.95rem] mb-4 leading-relaxed">
        Rhythm is made up of a few core ideas:
      </p>
      <ul className="space-y-3 mb-6">
        <li className="flex gap-3 text-[0.95rem]">
          <span className="font-serif text-lg" style={{ color: "var(--accent)" }}>1</span>
          <div>
            <strong>Beat</strong> — the steady pulse underlying the music.
            It&rsquo;s what a metronome clicks. When you clap along to a
            song, you&rsquo;re clapping the beat.
          </div>
        </li>
        <li className="flex gap-3 text-[0.95rem]">
          <span className="font-serif text-lg" style={{ color: "var(--accent)" }}>2</span>
          <div>
            <strong>Tempo</strong> — how fast or slow the beat goes. Measured
            in beats per minute (BPM). A ballad might be 60 BPM; a dance
            track might be 120.
          </div>
        </li>
        <li className="flex gap-3 text-[0.95rem]">
          <span className="font-serif text-lg" style={{ color: "var(--accent)" }}>3</span>
          <div>
            <strong>Meter</strong> — how beats are grouped into measures. This
            is what time signatures describe — the topic of the next lesson.
          </div>
        </li>
        <li className="flex gap-3 text-[0.95rem]">
          <span className="font-serif text-lg" style={{ color: "var(--accent)" }}>4</span>
          <div>
            <strong>Syncopation</strong> — when emphasis falls on unexpected
            beats. It&rsquo;s what makes funk funky and jazz jazzy.
          </div>
        </li>
      </ul>

      <h2
        className="text-2xl mt-10 mb-4"
        style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
      >
        Feel the difference
      </h2>
      <p className="text-[0.95rem] mb-4" style={{ color: "var(--text2)" }}>
        Listen to these three patterns. Same tempo, completely different feel
        — that&rsquo;s the power of rhythm.
      </p>

      {/* Interactive rhythm demo */}
      <div
        className="rounded-2xl p-7 my-6"
        style={{ background: "var(--bg2)" }}
      >
        <div className="flex flex-wrap gap-2 mb-5">
          {PATTERNS.map((p, i) => (
            <button
              key={p.name}
              onClick={() => switchPattern(i)}
              className="px-4 py-1.5 rounded-lg text-[0.85rem] font-medium border transition-all cursor-pointer select-none"
              style={{
                background: patternIdx === i ? "var(--accent)" : "var(--bg)",
                color: patternIdx === i ? "#fff" : "var(--text)",
                borderColor: patternIdx === i ? "var(--accent)" : "var(--border)",
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        <p className="text-sm mb-4" style={{ color: "var(--text2)" }}>
          {pattern.label}
        </p>

        {/* Beat visualization */}
        <div className="flex justify-center gap-2 mb-4">
          {pattern.beats.map((vol, i) => (
            <div
              key={i}
              className="rounded-md transition-all duration-75"
              style={{
                width: 36,
                height: vol === 0 ? 12 : vol >= 1 ? 48 : 32,
                background:
                  activeBeat === i
                    ? "var(--accent)"
                    : vol === 0
                    ? "var(--border)"
                    : vol >= 1
                    ? "#2E6FBA"
                    : "#85B7EB",
                opacity: activeBeat === i ? 1 : 0.5,
                alignSelf: "flex-end",
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => (playing ? stop() : start())}
            className="px-5 py-2 rounded-lg text-[0.85rem] font-semibold border-none text-white cursor-pointer select-none transition-all active:scale-[0.97]"
            style={{ background: "var(--accent)" }}
          >
            {playing ? "Stop" : "Play"}
          </button>
          <span className="text-sm" style={{ color: "var(--text3)" }}>
            Tap play to hear the pattern
          </span>
        </div>
      </div>

      <h2
        className="text-2xl mt-10 mb-4"
        style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
      >
        Why rhythm comes first
      </h2>
      <p className="text-[0.95rem] mb-4 leading-relaxed">
        We start with rhythm because it&rsquo;s the most fundamental element
        of music. You can have rhythm without melody (think drums), but you
        can&rsquo;t have melody without rhythm — every note has a duration,
        and that duration is rhythm.
      </p>
      <p className="text-[0.95rem] mb-4 leading-relaxed">
        In the lessons ahead, we&rsquo;ll break rhythm down piece by piece:
        how beats are grouped (time signatures), how long notes last (note
        values), and how rhythmic patterns create the grooves that define
        every genre of music.
      </p>

      <div
        className="rounded-r-lg py-4 px-5 my-6 text-[0.92rem]"
        style={{
          background: "var(--accent-light)",
          borderLeft: "3px solid var(--accent)",
        }}
      >
        <strong>The takeaway:</strong> Rhythm is the organization of sound in
        time. It&rsquo;s the when, not the what. Master rhythm, and every
        other aspect of music theory becomes easier to understand.
      </div>
    </div>
  );
}
