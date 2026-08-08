"use client";

import { useRef, useState } from "react";
import type { Session } from "@/lib/content";

function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SessionPlayer({ session }: { session: Session }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(
        () => {
          setPlaying(true);
          setStarted(true);
        },
        () => setMissing(true),
      );
    }
  }

  function seek(event: React.ChangeEvent<HTMLInputElement>) {
    const el = audioRef.current;
    if (!el || !duration) return;
    const next = (Number(event.target.value) / 100) * duration;
    el.currentTime = next;
    setElapsed(next);
  }

  const progress = duration ? (elapsed / duration) * 100 : 0;

  return (
    <div className="bg-paper p-7 transition-colors duration-300 hover:bg-paper-raised md:p-9">
      <div className="flex items-start gap-5 md:gap-7">
        <button
          onClick={toggle}
          aria-label={`${playing ? "Pause" : "Play"} ${session.title}`}
          className="group mt-1 flex size-12 shrink-0 items-center justify-center rounded-full border border-rule-strong text-ink transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-accent hover:text-accent"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <rect x="6" y="5" width="4" height="14" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-5 translate-x-px" aria-hidden>
              <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="display-face-sm text-title text-ink">
              {session.title}
            </h2>
            <span className="text-[0.8125rem] tabular-nums text-ink-muted">
              {session.duration}
            </span>
          </div>

          <p className="mt-3 leading-relaxed text-ink-soft">
            {session.description}
          </p>

          {/* Transport stays mounted once started — a paused session used to
              look identical to one never played. */}
          {started && (
            <div className="mt-6 flex items-center gap-4">
              <span className="text-[0.75rem] tabular-nums text-ink-muted">
                {clock(elapsed)}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={progress}
                onChange={seek}
                aria-label={`Seek within ${session.title}`}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-rule accent-accent"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) ${progress}%, var(--color-rule) ${progress}%)`,
                }}
              />
              <span className="text-[0.75rem] tabular-nums text-ink-muted">
                −{clock(Math.max(0, duration - elapsed))}
              </span>
            </div>
          )}

          {missing && (
            <p className="mt-5 text-[0.8125rem] text-ink-muted">
              This recording hasn’t been published yet.
            </p>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={`/audio/${session.slug}.mp3`}
        preload="none"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          setPlaying(false);
          setElapsed(0);
        }}
        onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
      />
    </div>
  );
}
