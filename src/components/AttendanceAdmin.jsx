import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { TRIBUS } from '../utils/groups'
import { isCulteOpen, formatDateFr, countPresents } from '../utils/attendance'
import { closeCulte, reopenCulte } from '../utils/cultes'
import AttendanceTribu from './AttendanceTribu'

export default function AttendanceAdmin({
  cultes,
  allAttendance,
  allUsers,
  delegatedMembers,
  patriarchesMap,
  myTribuAsPatriarche
}) {
  const { user } = useAuth()
  const [selectedTribu, setSelectedTribu] = useState(myTribuAsPatriarche || TRIBUS[0].key)
  const [selectedCulteId, setSelectedCulteId] = useState(cultes[0]?.id || '')
  const [error, setError] = useState('')

  const culte = cultes.find((c) => c.id === selectedCulteId)
  const culteOpen = isCulteOpen(culte)

  async function toggleClose() {
    if (!culte) return
    const action = culte.closed ? 'réouvrir' : 'clôturer'
    if (!window.confirm(`Voulez-vous ${action} le culte "${culte.theme}" du ${formatDateFr(culte.date)} ?`)) return
    try {
      if (culte.closed) await reopenCulte(culte.id)
      else await closeCulte(culte.id)
    } catch (err) {
      setError('Échec : ' + err.message)
    }
  }

  return (
    <div className="attendance-admin">
      <h3 style={{ color: 'var(--color-teal-dark)' }}>👑 Vue Admin — Toutes les tribus</h3>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <select
          value={selectedCulteId}
          onChange={(e) => setSelectedCulteId(e.target.value)}
          style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd6c8' }}
        >
          {cultes.map((c) => (
            <option key={c.id} value={c.id}>
              {formatDateFr(c.date)} — {c.theme} {c.closed ? '🔒' : '🔓'}
            </option>
          ))}
        </select>

        <select
          value={selectedTribu}
          onChange={(e) => setSelectedTribu(e.target.value)}
          style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd6c8' }}
        >
          {TRIBUS.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label} {patriarchesMap[t.key] ? '👑' : '—'}
            </option>
          ))}
        </select>

        {culte && (
          <button
            onClick={toggleClose}
            style={{
              background: culte.closed ? 'var(--color-teal)' : 'var(--color-crimson)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            {culte.closed ? '🔓 Réouvrir' : '🔒 Clôturer'}
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {culte && (
        <>
          <p className="muted-small">
            Thème : <strong>{culte.theme}</strong> — {culte.type} — {formatDateFr(culte.date)}
            {culte.heure && ` à ${culte.heure}`}
          </p>
          <p className="muted-small">
            {culteOpen ? '✅ Ouvert' : '🔒 Clôturé'} — Présents totaux :{' '}
            <strong>
              {TRIBUS.reduce(
                (sum, t) => sum + countPresents(allAttendance[culte.date], culte.id, t.key),
                0
              )}
            </strong>
          </p>

          <AttendanceTribu
            tribuKey={selectedTribu}
            tribuLabel={TRIBUS.find((t) => t.key === selectedTribu)?.label || selectedTribu}
            cultes={[culte]}
            allAttendance={allAttendance}
            allUsers={allUsers}
            delegatedMembers={delegatedMembers}
          />
        </>
      )}
    </div>
  )
}