import { avatarsForSexe } from '../utils/avatars'

// Grille de sélection d'avatar.
// sexe : 'homme' | 'femme'
// value : avatarId actuellement sélectionné
// onChange : callback appelé avec le nouvel id
export default function AvatarPicker({ sexe, value, onChange }) {
  const avatars = avatarsForSexe(sexe)

  if (!sexe) {
    return (
      <p className="muted-small" style={{ fontStyle: 'italic' }}>
        Choisis d'abord ton sexe pour voir les avatars disponibles.
      </p>
    )
  }

  return (
    <div className="avatar-picker">
      <p className="muted-small" style={{ marginBottom: 8 }}>
        Choisis ton avatar (obligatoire)
      </p>
      <div className="avatar-grid">
        {avatars.map((a) => {
          const selected = value === a.id
          return (
            <button
              key={a.id}
              type="button"
              className={selected ? 'avatar-choice selected' : 'avatar-choice'}
              onClick={() => onChange(a.id)}
              title={a.label}
              aria-label={`Avatar ${a.label}`}
              aria-pressed={selected}
              style={{
                background: a.color,
                outline: selected ? '3px solid var(--color-gold)' : 'none'
              }}
            >
              <span style={{ fontSize: 26, lineHeight: 1 }}>{a.emoji}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}