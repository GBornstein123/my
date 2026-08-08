/**
 * Slow, almost-imperceptible gradient drift in the hero's empty right side.
 * Deliberately kept off the display type — a wash under large serif dirties
 * the edges — and dimmed in dark, where the tint reads as backlight bleed.
 * Pure CSS; the breathe animation is disabled by prefers-reduced-motion.
 */
export function AmbientField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-90 dark:opacity-35"
    >
      <div className="breathing absolute -right-[10%] -top-[10%] h-[44rem] w-[44rem] rounded-full bg-[radial-gradient(circle_at_center,var(--color-accent-soft)_0%,transparent_65%)] blur-3xl" />
      <div
        className="breathing absolute -bottom-[26%] right-[16%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,var(--color-paper-sunk)_0%,transparent_68%)] blur-3xl"
        style={{ animationDelay: "-7s" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper" />
    </div>
  );
}
