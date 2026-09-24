/** The wave's shape, straight from the recording pill's design. */
export const WAVE_BARS = [
  8, 8, 24, 15, 29, 25, 20, 12, 26, 10, 24, 8, 8, 22, 12, 24, 12, 22, 15, 15,
  29, 8, 8,
];

const PEAK = 29;

/**
 * The pattern twice over. A sent note is wider than the recording pill, and the
 * run starts and ends on the same short bar, so it loops with no visible seam.
 */
const PLAYBACK_BARS = [...WAVE_BARS, ...WAVE_BARS];

const TONES = {
  /** On a neutral card: the chat bubble and the composer's review pill. */
  light: { rest: "bg-jumpa-primary-200", played: "bg-jumpa-primary-600" },
  /** On the brand purple. */
  brand: { rest: "bg-jumpa-white/40", played: "bg-jumpa-alt-400" },
};

/**
 * A voice note's waveform, filled as far as it has played. The shape is fixed
 * rather than sampled from the audio — decoding a clip to draw its peaks costs
 * a `fetch` plus an `AudioContext` per message, which is not worth it for
 * decoration. Every note draws the same wave, as it does while recording.
 */
export function VoiceWaveform({
  progress,
  tone = "light",
  className = "h-6",
}: {
  /** 0–1. */
  progress: number;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const played = Math.min(100, Math.max(0, progress * 100));

  return (
    <div
      className={`relative flex w-full items-center ${className}`}
      aria-hidden="true"
    >
      <Row className={TONES[tone].rest} />
      {/* The same row again, clipped to what has played — one set of bars in
          two colours can never fall out of alignment the way two sets could. */}
      <div
        className="absolute inset-0 flex items-center"
        style={{ clipPath: `inset(0 ${100 - played}% 0 0)` }}
      >
        <Row className={TONES[tone].played} />
      </div>
    </div>
  );
}

function Row({ className }: { className: string }) {
  return (
    <div className="flex h-full w-full items-center gap-px">
      {PLAYBACK_BARS.map((height, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed decorative pattern
          key={index}
          style={{ height: `${Math.round((height / PEAK) * 100)}%` }}
          className={`min-w-0 flex-1 rounded-full ${className}`}
        />
      ))}
    </div>
  );
}
