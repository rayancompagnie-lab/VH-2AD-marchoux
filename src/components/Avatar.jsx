import { findAvatar } from '../utils/avatars'

// Affiche un avatar (emoji + couleur ronde).
// size : taille en pixels
// avatarId : l'id de l'avatar choisi (ex: 'h-lion', 'f-fleur')
// name : facultatif, pour un fallback sur la première lettre
export default function Avatar({ avatarId, size = 40, name = '' }) {
  const a = avatarId ? findAvatar(avatarId) : null

  if (!a) {
    // Fallback : première lettre du nom sur fond teal
    const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--color-teal)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: size * 0.45,
          flexShrink: 0
        }}
      >
        {initial}
      </div>
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: a.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.55,
        flexShrink: 0,
        lineHeight: 1
      }}
      title={a.label}
    >
      <span style={{ lineHeight: 1 }}>{a.emoji}</span>
    </div>
  )
}