import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { TRIBUS } from '../utils/groups'
import { listenCultes, closeCulte, reopenCulte } from '../utils/cultes'
import { formatDateFr } from '../utils/attendance'

export default function AttendanceReport() {
  const { isAdmin } = useAuth()
  const [cultes, setCultes] = useState([])
  const [allAttendance, setAllAttendance] = useState({})
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    const unsubC = listenCultes((list) => {
      setCultes(list)
      if (!selectedDate && list[0]) setSelectedDate(list[0].date)
    })
    const unsubA = onValue(ref(db, 'attendance'), (s) => setAllAttendance(s.val() || {}))
    return () => {
      unsubC()
      unsubA()
    }
  }, [])

  if (!isAdmin) return null

  const cultesOfDate = cultes.filter((c) => c.date === selectedDate)
  const dayData = allAttendance[selectedDate] || {}

  function tribuCounts(culteId, status) {
    const result = {}
    for (const t of TRIBUS) {
      const tribuData = dayData[culteId]?.[t.key] || {}
      result[t.key] = Object.values(tribuData).filter((m) => m.status === status).length
    }
    return result
  }

  function totalOfCulte(culteId, status) {
    let total = 0
    for (const t of TRIBUS) {
      const tribuData = dayData[culteId]?.[t.key] || {}
      total += Object.values(tribuData).filter((m) => m.status === status).length
    }
    return total
  }

  return (
    <div className="attendance-report">
      <h2>📊 Rapport de présence</h2>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Date :{' '}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
      </div>

      <p className="muted-small">📅 {formatDateFr(selectedDate)}</p>

      {cultesOfDate.length === 0 && (
        <p>Aucun culte programmé pour cette date.</p>
      )}

      {cultesOfDate.map((culte) => {
        const presents = totalOfCulte(culte.id, 'present')
        const absents = totalOfCulte(culte.id, 'absent')
        return (
          <div
            key={culte.id}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, color: 'var(--color-teal-dark)' }}>
                {culte.theme} {culte.heure && <em className="muted-small">({culte.heure})</em>}
              </h3>
              <span style={{ fontSize: 12 }}>
                {culte.closed ? '🔒 Clôturé' : '🔓 Ouvert'}
              </span>
            </div>

            <p style={{ fontSize: 18, fontWeight: 800, margin: '8px 0' }}>
              <span style={{ color: 'var(--color-green)' }}>✅ {presents} présent(s)</span>
              {' — '}
              <span style={{ color: 'var(--color-crimson)' }}>❌ {absents} absent(s)</span>
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
                    const p = tribuCounts(culte.id, 'present')[t.key] || 0
                    const a = tribuCounts(culte.id, 'absent')[t.key] || 0
                    if (p === 0 && a === 0) return null
                    return (
                      <tr key={t.key}>
                        <td>{t.label}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-green)' }}>{p}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-crimson)' }}>{a}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </details>

            <div style={{ marginTop: 10 }}>
              {culte.closed ? (
                <button
                  onClick={() => reopenCulte(culte.id)}
                  style={{
                    background: 'var(--color-teal)',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  🔓 Réouvrir
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (window.confirm(`Clôturer le culte "${culte.theme}" ?`)) closeCulte(culte.id)
                  }}
                  style={{
                    background: 'var(--color-crimson)',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  🔒 Clôturer
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}