"use client";

import { useRef, useState } from "react";
import type { Session } from "@/lib/content";

export function SessionPlayer({ session }: { session: Session }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);
  const [progress, setProgress] = useState(0);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(
        () => setPlaying(true),
        // No file uploaded yet — surface it plainly rather than failing silent.
        () => setMissing(true),
      );
    }
  }

  return (
    <div className="bg-paper p-7 transition-colors duration-300 hover:bg-paper-raised md:p-9">
      <div className="flex items-start gap-5 md:gap-7">
        <button
          onClick={toggle}
          aria-label={`${playing ? "Pause" : "Play"} ${session.title}`}
          className="group mt-1 flex size-12 shrink-0 items-center justify-center rounded-full border border-rule text-ink transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-accent hover:text-accent md:size-14"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <rect x="6" y="5" width="4" height="14" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-4 translate-x-px" aria-hidden>
              <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="display-face text-title text-ink">{session.title}</h2>
            <span className="text-[0.8125rem] tabular-nums text-ink-muted">
              {session.duration}
            </span>
          </div>

          <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
            {session.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs text-accent-ink">
              {session.best}
            </span>
          </div>

          {playing && (
            <div className="mt-6 h-0.5 w-full overflow-hidden rounded-full bg-rule">
              <div
                className="h-full bg-accent transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {missing && (
            <p className="mt-5 text-[0.8125rem] text-ink-muted">
              Recording not uploaded yet — drop the file at{" "}
              <code className="text-accent">
                /public/audio/{session.slug}.mp3
              </code>
              .
            </p>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={`/audio/${session.slug}.mp3`}
        preload="none"
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress((el.currentTime / el.duration) * 100);
        }}
      />
    </div>
  );
}
