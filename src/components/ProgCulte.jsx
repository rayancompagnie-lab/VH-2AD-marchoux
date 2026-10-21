import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listenCultes, createCulte, deleteCulte, closeCulte, reopenCulte } from '../utils/cultes'
import { formatDateFr } from '../utils/attendance'

export default function ProgCulte() {
  const { user } = useAuth()
  const [cultes, setCultes] = useState([])
  const [theme, setTheme] = useState('')
  const [date, setDate] = useState('')
  const [heure, setHeure] = useState('')
  const [type, setType] = useState('dimanche')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const unsub = listenCultes(setCultes)
    return unsub
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    if (!theme || !date) {
      setError('Thème et date obligatoires.')
      return
    }
    setSending(true)
    try {
      await createCulte({
        theme,
        date,
        heure,
        type,
        createdBy: user.uid
      })
      setTheme('')
      setDate('')
      setHeure('')
      setType('dimanche')
    } catch (err) {
      setError('Échec : ' + err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(id, label) {
    if (!window.confirm(`Supprimer définitivement le culte "${label}" ?\n\nLes présences associées ne seront plus affichées.`)) return
    try {
      await deleteCulte(id)
    } catch (err) {
      setError('Échec : ' + err.message)
    }
  }

  async function toggleClose(c) {
    try {
      if (c.closed) await reopenCulte(c.id)
      else await closeCulte(c.id)
    } catch (err) {
      setError('Échec : ' + err.message)
    }
  }

  return (
    <section>
      <h3>📅 Programmer un culte</h3>
      <form onSubmit={handleCreate} className="badge-form" style={{ flexWrap: 'wrap', gap: 8 }}>
        {error && <p className="error" style={{ width: '100%' }}>{error}</p>}
        <input
          placeholder="Thème du culte"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={{ minWidth: 180 }}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="time"
          value={heure}
          onChange={(e) => setHeure(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="dimanche">Dimanche</option>
          <option value="mercredi">Mercredi</option>
          <option value="special">Spécial</option>
        </select>
        <button type="submit" disabled={sending}>
          {sending ? 'Création...' : 'Programmer'}
        </button>
      </form>

      <div style={{ marginTop: 16 }}>
        <h4 style={{ color: 'var(--color-teal-dark)', fontSize: 14 }}>
          {cultes.length} culte(s) programmé(s)
        </h4>
        {cultes.length === 0 && <p className="muted-small">Aucun culte programmé.</p>}
        {cultes.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 10px',
              background: c.closed ? '#f5f5f5' : 'white',
              border: '1px solid #eee7d5',
              borderRadius: 8,
              marginBottom: 6,
              flexWrap: 'wrap',
              gap: 6
            }}
          >
            <span style={{ flex: 1, minWidth: 200, fontSize: 13 }}>
              <strong>{formatDateFr(c.date)}</strong>
              {c.heure && ` à ${c.heure}`} — {c.theme}
              {' '}
              <em className="muted-small">({c.type})</em>
              {' '}
              {c.closed ? '🔒' : '🔓'}
            </span>
            <button
              onClick={() => toggleClose(c)}
              style={{
                background: c.closed ? 'var(--color-teal)' : 'var(--color-crimson)',
                color: 'white',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              {c.closed ? 'Réouvrir' : 'Clôturer'}
            </button>
            <button
              onClick={() => handleDelete(c.id, c.theme)}
              style={{
                background: 'var(--color-crimson-dark)',
                color: 'white',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}