/**
 * Slow, almost-imperceptible gradient drift behind the hero.
 * Pure CSS — no canvas, no JS, respects prefers-reduced-motion via globals.
 */
export function AmbientField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="breathing absolute -top-[28%] left-[8%] h-[52rem] w-[52rem] rounded-full bg-[radial-gradient(circle_at_center,var(--color-accent-soft)_0%,transparent_62%)] blur-3xl" />
      <div
        className="breathing absolute -right-[14%] top-[6%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,var(--color-paper-sunk)_0%,transparent_66%)] blur-3xl"
        style={{ animationDelay: "-7s" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper" />
    </div>
  );
}
