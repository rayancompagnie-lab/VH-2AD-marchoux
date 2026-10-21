import { useEffect, useState } from 'react'
import { ref, set, remove, onValue } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { isCulteOpen, formatDateFr, getMemberStatus, countPresents } from '../utils/attendance'
import Avatar from './Avatar'

export default function AttendanceTribu({
  tribuKey,
  tribuLabel,
  cultes,
  allAttendance,
  allUsers,
  delegatedMembers
}) {
  const { user } = useAuth()
  const [selectedCulteId, setSelectedCulteId] = useState(cultes[0]?.id || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Membres de la tribu = users + délégués
  const tribuMembers = [
    ...Object.entries(allUsers)
      .map(([uid, u]) => ({ uid, ...u, __type: 'user' }))
      .filter((u) => u.tribu === tribuKey),
    ...delegatedMembers
      .filter((m) => m.tribu === tribuKey)
      .map((m) => ({ ...m, __type: 'delegue' }))
  ].sort((a, b) => (a.prenom || '').localeCompare(b.prenom || ''))

  const culte = cultes.find((c) => c.id === selectedCulteId)
  const culteOpen = isCulteOpen(culte)

  async function mark(uid, name, avatarId, status) {
    if (!culteOpen || saving) return
    setSaving(true)
    setError('')
    try {
      await set(ref(db, `attendance/${culte.date}/${culte.id}/${tribuKey}/${uid}`), {
        uid,
        name,
        avatarId: avatarId || '',
        status,
        markedBy: user.uid,
        markedAt: Date.now()
      })
    } catch (err) {
      setError('Échec : ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function unmark(uid) {
    if (!culteOpen || saving) return
    setSaving(true)
    try {
      await remove(ref(db, `attendance/${culte.date}/${culte.id}/${tribuKey}/${uid}`))
    } catch (err) {
      setError('Échec : ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="attendance-tribu">
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
      </div>

      {culte && (
        <>
          <p className="muted-small">
            {culteOpen
              ? '✅ Appel ouvert — tu peux cocher les membres.'
              : '🔒 Culte clôturé — plus de modification possible.'}
          </p>
          <p className="muted-small">
            Tribu <strong>{tribuLabel}</strong> — {tribuMembers.length} membre(s) —{' '}
            {countPresents(allAttendance[culte.date], culte.id, tribuKey)} présent(s)
          </p>
        </>
      )}

      {error && <p className="error">{error}</p>}

      <div style={{ marginTop: 12 }}>
        {tribuMembers.map((m) => {
          const status = getMemberStatus(allAttendance[culte?.date], culte?.id, tribuKey, m.uid)
          return (
            <div
              key={m.uid}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: '1px solid #eee7d5'
              }}
            >
              <Avatar avatarId={m.avatarId} size={36} name={m.prenom} />
              <span style={{ flex: 1, fontSize: 14 }}>
                {m.prenom} {m.nom}
                {m.__type === 'delegue' && (
                  <em className="muted-small"> (délégué)</em>
                )}
                {status === 'present' && <em style={{ color: 'var(--color-green)' }}> ✅</em>}
                {status === 'absent' && <em style={{ color: 'var(--color-crimson)' }}> ❌</em>}
              </span>

              {culteOpen && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => mark(m.uid, `${m.prenom} ${m.nom}`, m.avatarId, 'present')}
                    disabled={saving}
                    title="Marquer présent"
                    style={{
                      background: status === 'present' ? 'var(--color-green)' : 'white',
                      color: status === 'present' ? 'white' : 'var(--color-green)',
                      border: '2px solid var(--color-green)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    ✅
                  </button>
                  <button
                    onClick={() => mark(m.uid, `${m.prenom} ${m.nom}`, m.avatarId, 'absent')}
                    disabled={saving}
                    title="Marquer absent"
                    style={{
                      background: status === 'absent' ? 'var(--color-crimson)' : 'white',
                      color: status === 'absent' ? 'white' : 'var(--color-crimson)',
                      border: '2px solid var(--color-crimson)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    ❌
                  </button>
                  {status && (
                    <button
                      onClick={() => unmark(m.uid)}
                      disabled={saving}
                      title="Effacer"
                      style={{
                        background: 'none',
                        border: '1px solid #ccc',
                        padding: '4px 10px',
                        borderRadius: 6,
                        cursor: 'pointer'
                      }}
                    >
                      ↺
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}