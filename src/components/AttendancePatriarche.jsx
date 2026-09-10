import { useEffect, useState } from 'react'
import { onValue, ref, set, update } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { isPointageOpen } from '../utils/attendance'

export default function AttendancePatriarche({ culteKey, culteLabel, todayKey, todayData }) {
  const { user, profile } = useAuth()
  const [myTribuMembers, setMyTribuMembers] = useState([])
  const [error, setError] = useState('')

  const tribu = profile?.tribu
  const closedByAdmin = todayData?.[culteKey]?.closed === true
  const openCheck = isPointageOpen(new Date(), closedByAdmin)

  // Charge tous les membres de ma tribu
  useEffect(() => {
    if (!tribu) return
    const unsub = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val() || {}
      const list = Object.entries(data)
        .map(([uid, u]) => ({ uid, ...u }))
        .filter((u) => u.tribu === tribu)
        .sort((a, b) => (a.prenom || '').localeCompare(b.prenom || ''))
      setMyTribuMembers(list)
    })
    return unsub
  }, [tribu])

  if (!tribu) {
    return <p className="error">Tu n'as pas de tribu dans ton profil.</p>
  }

  const pointages = todayData?.[culteKey]?.[tribu] || {}

  async function confirmMember(uid, name, photo) {
    await set(ref(db, `attendance/${todayKey}/${culteKey}/${tribu}/${uid}`), {
      uid,
      name,
      photo: photo || '',
      status: 'present',
      rejected: false,
      markedAt: Date.now(),
      markedBy: user.uid,
      confirmedBy: user.uid
    })
  }

  async function rejectMember(uid) {
    if (!window.confirm('Rejeter ce pointage ? Le membre sera marqué absent.')) return
    await update(ref(db, `attendance/${todayKey}/${culteKey}/${tribu}/${uid}`), {
      status: 'absent',
      rejected: true,
      rejectedBy: user.uid,
      rejectedAt: Date.now()
    })
  }

  async function markAbsent(uid, name, photo) {
    await set(ref(db, `attendance/${todayKey}/${culteKey}/${tribu}/${uid}`), {
      uid,
      name,
      photo: photo || '',
      status: 'absent',
      rejected: false,
      markedAt: Date.now(),
      markedBy: user.uid
    })
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}

      <p className="muted-small">
        👑 Tu es Patriarche/Matriarche de la tribu <strong>{tribu}</strong>.
        {!openCheck.open && <> 🔒 {openCheck.reason}</>}
      </p>

      <div style={{ marginTop: 12 }}>
        <h4 style={{ fontSize: 14, color: 'var(--color-teal-dark)' }}>
          📋 {myTribuMembers.length} membres — {Object.keys(pointages).length} pointé(s)
        </h4>

        {myTribuMembers.map((m) => {
          const p = pointages[m.uid]
          const status = p?.status
          return (
            <div
              key={m.uid}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: '1px solid #eee7d5'
              }}
            >
              {m.photoPrincipale ? (
                <img src={m.photoPrincipale} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--color-teal)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: 14
                }}>
                  {(m.prenom || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ flex: 1, fontSize: 14 }}>
                {m.prenom} {m.nom}
                {status === 'present' && !p.rejected && <em style={{ color: 'var(--color-green)' }}> ✅ Présent</em>}
                {status === 'absent' && <em style={{ color: 'var(--color-crimson)' }}> ❌ Absent</em>}
                {!status && <em style={{ color: 'var(--color-text-muted)' }}> ⏳ Non pointé</em>}
              </span>

              {openCheck.open && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {status !== 'present' && (
                    <button
                      onClick={() => confirmMember(m.uid, `${m.prenom} ${m.nom}`, m.photoPrincipale)}
                      title="Marquer présent"
                      style={{ background: 'var(--color-green)', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}
                    >
                      ✅
                    </button>
                  )}
                  {status !== 'absent' && (
                    <button
                      onClick={() => markAbsent(m.uid, `${m.prenom} ${m.nom}`, m.photoPrincipale)}
                      title="Marquer absent"
                      style={{ background: 'var(--color-crimson)', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}
                    >
                      ❌
                    </button>
                  )}
                  {status === 'present' && (
                    <button
                      onClick={() => rejectMember(m.uid)}
                      title="Rejeter ce pointage"
                      style={{ background: 'orange', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}
                    >
                      🚫
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