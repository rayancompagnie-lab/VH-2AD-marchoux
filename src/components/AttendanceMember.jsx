import { useState } from 'react'
import { ref, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { isPointageOpen } from '../utils/attendance'

export default function AttendanceMember({ culteKey, culteLabel, todayKey, todayData }) {
  const { user, profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const tribu = profile?.tribu
  const myPointage = todayData?.[culteKey]?.[tribu]?.[user?.uid]
  const status = myPointage?.status
  const rejected = myPointage?.rejected

  const closedByAdmin = todayData?.[culteKey]?.closed === true
  const openCheck = isPointageOpen(new Date(), closedByAdmin)

  async function mark(choice) {
    if (!openCheck.open) {
      setError(openCheck.reason)
      return
    }
    if (!tribu) {
      setError('Tu dois avoir une tribu dans ton profil.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await set(ref(db, `attendance/${todayKey}/${culteKey}/${tribu}/${user.uid}`), {
        uid: user.uid,
        name: `${profile.prenom || ''} ${profile.nom || ''}`.trim(),
        avatarId: profile.avatarId || '',
        status: choice,
        rejected: false,
        markedAt: Date.now(),
        markedBy: user.uid
      })
    } catch (err) {
      setError("Échec de l'enregistrement : " + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!openCheck.open) {
    return (
      <div className="pointage-box">
        <p className="muted-small">🔒 {openCheck.reason}</p>
        {status && (
          <p>Ton statut : <strong>{status === 'present' ? '✅ Présent' : '❌ Absent'}</strong></p>
        )}
      </div>
    )
  }

  return (
    <div className="pointage-box" style={{ padding: 12, background: '#faf7ee', borderRadius: 10 }}>
      {error && <p className="error">{error}</p>}

      {rejected ? (
        <p className="error">⚠️ Ton pointage a été rejeté par ton Patriarche.</p>
      ) : status ? (
        <p>
          Ton statut : <strong>{status === 'present' ? '✅ Présent' : '❌ Absent'}</strong>
          {status === 'present' && <span className="muted-small"> (en attente de confirmation du patriarche)</span>}
        </p>
      ) : (
        <p>Tu n'as pas encore pointé.</p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={() => mark('present')}
          disabled={saving}
          style={{
            background: status === 'present' ? 'var(--color-green)' : 'white',
            color: status === 'present' ? 'white' : 'var(--color-green)',
            border: '2px solid var(--color-green)',
            padding: '8px 16px',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          ✅ Présent
        </button>
        <button
          onClick={() => mark('absent')}
          disabled={saving}
          style={{
            background: status === 'absent' ? 'var(--color-crimson)' : 'white',
            color: status === 'absent' ? 'white' : 'var(--color-crimson)',
            border: '2px solid var(--color-crimson)',
            padding: '8px 16px',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          ❌ Absent
        </button>
      </div>
    </div>
  )
}