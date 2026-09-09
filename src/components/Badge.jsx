export default function Badge({ badge }) {
  if (!badge) return null
  const { name, colors = ['#6b46c1'] } = badge
  const background =
    colors.length > 1
      ? `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`
      : colors[0]

  return (
    <span className="badge-pill" style={{ background }}>
      {name}
    </span>
  )
}
