import { useEffect, useState } from 'react'
import { onValue, ref, update } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { TRIBUS } from '../utils/groups'
import { formatDateFr, todayKey } from '../utils/attendance'

export default function AttendanceReport() {
  const { isAdmin } = useAuth()
  const [allAttendance, setAllAttendance] = useState({})
  const [config, setConfig] = useState({ culte3Special: false })
  const [selectedDate, setSelectedDate] = useState(todayKey())

  useEffect(() => {
    const unsubA = onValue(ref(db, 'attendance'), (s) => setAllAttendance(s.val() || {}))
    const unsubC = onValue(ref(db, 'config'), (s) => setConfig(s.val() || { culte3Special: false }))
    return () => { unsubA(); unsubC() }
  }, [])

  if (!isAdmin) return null

  async function toggle3eCulte() {
    await update(ref(db, 'config'), { culte3Special: !config.culte3Special })
  }

  async function closeCulte(culteKey) {
    if (!window.confirm(`Fermer le pointage pour ${culteKey} le ${selectedDate} ?`)) return
    await update(ref(db, `attendance/${selectedDate}/${culteKey}`), { closed: true })
  }

  async function reopenCulte(culteKey) {
    if (!window.confirm(`Réouvrir le pointage pour ${culteKey} ?`)) return
    await update(ref(db, `attendance/${selectedDate}/${culteKey}`), { closed: false })
  }

  const dayData = allAttendance[selectedDate] || {}
  const culteKeys = Object.keys(dayData).filter((k) => k.startsWith('culte') || k === 'mercredi')

  // Récap par tribu pour chaque culte
  function tribuCounts(culteKey, status) {
    const tribus = dayData[culteKey] || {}
    const result = {}
    for (const [tribuKey, members] of Object.entries(tribus)) {
      if (typeof members !== 'object') continue
      result[tribuKey] = Object.values(members).filter((m) => m.status === status).length
    }
    return result
  }

  const totalPresents = (culteKey) => {
    const tribus = dayData[culteKey] || {}
    let total = 0
    for (const members of Object.values(tribus)) {
      if (typeof members !== 'object') continue
      total += Object.values(members).filter((m) => m.status === 'present').length
    }
    return total
  }

  return (
    <div className="attendance-report">
      <h2>📊 Rapport de présence</h2>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Date : <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={config.culte3Special} onChange={toggle3eCulte} />
          3ème culte spécial (activé par admin)
        </label>
      </div>

      <p className="muted-small">📅 {formatDateFr(selectedDate)}</p>

      {culteKeys.length === 0 && <p>Aucun pointage enregistré pour cette date.</p>}

      {culteKeys.map((culteKey) => {
        const closed = dayData[culteKey]?.closed === true
        const label = culteKey === 'mercredi' ? 'Culte du mercredi' : culteKey.replace('culte', 'Culte n°')
        return (
          <div
            key={culteKey}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--color-teal-dark)' }}>{label}</h3>
              <span style={{ fontSize: 12 }}>
                {closed ? '🔒 Fermé' : '🔓 Ouvert'}
              </span>
            </div>

            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-green)', margin: '8px 0' }}>
              ✅ {totalPresents(culteKey)} présents
            </p>

            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Détail par tribu</summary>
              <table style={{ width: '100%', marginTop: 8, fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Tribu</th>
                    <th style={{ textAlign: 'right' }}>Présents</th>
                    <th style={{ textAlign: 'right' }}>Absents</th>
                  </tr>
                </thead>
                <tbody>
                  {TRIBUS.map((t) => {
                    const presents = tribuCounts(culteKey, 'present')[t.key] || 0
                    const absents = tribuCounts(culteKey, 'absent')[t.key] || 0
                    if (presents === 0 && absents === 0) return null
                    return (
                      <tr key={t.key}>
                        <td>{t.label}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-green)' }}>{presents}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-crimson)' }}>{absents}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </details>

            <div style={{ marginTop: 10 }}>
              {closed ? (
                <button
                  onClick={() => reopenCulte(culteKey)}
                  style={{ background: 'var(--color-teal)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}
                >
                  🔓 Réouvrir
                </button>
              ) : (
                <button
                  onClick={() => closeCulte(culteKey)}
                  style={{ background: 'var(--color-crimson)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}
                >
                  🔒 Fermer le pointage
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}