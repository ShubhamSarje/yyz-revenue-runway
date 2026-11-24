/** Split-flap characters. Re-keyed on value so every change replays the flip, left to right. */
export default function Flaps({ text, delay = 0 }) {
  const chars = [...(text ?? '–')]
  return (
    <span className="flaps" aria-label={text} role="img">
      {chars.map((c, i) => (
        <span
          key={`${text}-${i}`}
          className={`flap${/[.,%×$−+]/.test(c) ? ' sym' : ''}`}
          style={{ animationDelay: `${delay + i * 45}ms` }}
          aria-hidden="true"
        >
          {c}
        </span>
      ))}
    </span>
  )
}
