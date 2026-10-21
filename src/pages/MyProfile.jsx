import { useEffect, useState } from 'react'
import { ref, onValue, update } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { normalizeIvorianPhone } from '../utils/phone'
import { findTribu, findStatut } from '../utils/groups'
import { memberStats } from '../utils/attendance'
import PremiumBadge from '../components/PremiumBadge'
import Avatar from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'

export default function MyProfile() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({
    avatarId: profile?.avatarId || '',
    titre: profile?.titre || '',
    experience: profile?.experience || '',
    contact: profile?.contact || '',
    lieuHabitation: profile?.lieuHabitation || '',
    service: profile?.service || '',
    serviceVisible: !!profile?.serviceVisible
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [stats, setStats] = useState(null)

  // Statistiques de présence (5 derniers cultes clôturés)
  useEffect(() => {
    if (!profile?.tribu || !user?.uid) return

    let cultesCache = []
    let attendanceCache = {}

    const updateStats = () => {
      setStats(memberStats(attendanceCache, user.uid, profile.tribu, cultesCache, 5))
    }

    const unsubC = onValue(ref(db, 'cultes'), (snap) => {
      const data = snap.val() || {}
      cultesCache = Object.entries(data)
        .map(([id, c]) => ({ id, ...c }))
        .filter((c) => c.closed === true)
        .sort((a, b) => {
          const dA = `${a.date || ''}${a.heure || ''}`
          const dB = `${b.date || ''}${b.heure || ''}`
          return dB.localeCompare(dA)
        })
      updateStats()
    })

    const unsubA = onValue(ref(db, 'attendance'), (snap) => {
      attendanceCache = snap.val() || {}
      updateStats()
    })

    return () => {
      unsubC()
      unsubA()
    }
  }, [profile?.tribu, user?.uid])

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.contact) {
      setError('Le contact est obligatoire.')
      return
    }
    if (!form.avatarId) {
      setError('Choisis un avatar.')
      return
    }
    setSending(true)
    try {
      await update(ref(db, `users/${user.uid}`), {
        ...form,
        contact: normalizeIvorianPhone(form.contact)
      })
      setSaved(true)
    } finally {
      setSending(false)
    }
  }

  if (!profile) return null

  const premium = !!profile.premium || profile.role === 'admin'
  const tribu = findTribu(profile.tribu)
  const statut = findStatut(profile.statutRelationnel)

  return (
    <div className="my-profile">
      <h2>Mon profil</h2>
      <div className="profile-summary">
        <div style={{ marginBottom: 8 }}>
          <Avatar avatarId={form.avatarId || profile.avatarId} size={84} name={profile.prenom} />
        </div>
        <p><strong>{profile.prenom} {profile.nom}</strong></p>
        <p className="muted">{profile.email}</p>
        <p className="muted">
          {profile.sexe === 'femme' ? '🌸 Femme' : profile.sexe === 'homme' ? '🛡️ Homme' : '—'}
        </p>
        <div className="badges">
          <PremiumBadge show={premium} canRequest={!premium} name={`${profile.prenom} ${profile.nom}`} />
          {tribu && <span className="badge-pill" style={{ background: tribu.color }}>{tribu.label}</span>}
          {statut && <span className="badge-pill" style={{ background: statut.color }}>{statut.label}</span>}
        </div>

        {stats && stats.total > 0 && (
          <div style={{ marginTop: 10, padding: 10, background: '#faf7ee', borderRadius: 8, width: '100%' }}>
            <p className="muted-small" style={{ margin: 0 }}>
              📊 <strong>Ma présence</strong> (5 derniers cultes clôturés)
            </p>
            <p style={{ margin: '4px 0 0 0' }}>
              ✅ {stats.presents} / {stats.total}
              {stats.absents > 0 && <> — ❌ {stats.absents}</>}
              {stats.nonPointes > 0 && <> — ⏳ {stats.nonPointes} non pointé(s)</>}
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="auth-form profile-form">
        {error && <p className="error">{error}</p>}
        {saved && <p className="success">Profil mis à jour.</p>}

        <AvatarPicker
          sexe={profile.sexe}
          value={form.avatarId}
          onChange={(id) => updateField('avatarId', id)}
        />

        <input
          placeholder="Titre / responsabilité (facultatif)"
          value={form.titre}
          onChange={(e) => updateField('titre', e.target.value)}
        />
        <input
          placeholder="Travail ou expérience (facultatif)"
          value={form.experience}
          onChange={(e) => updateField('experience', e.target.value)}
        />
        <input
          placeholder="Contact WhatsApp (obligatoire), ex: 0102030405"
          value={form.contact}
          onChange={(e) => updateField('contact', e.target.value)}
          required
        />
        <input
          placeholder="Lieu d'habitation (facultatif)"
          value={form.lieuHabitation}
          onChange={(e) => updateField('lieuHabitation', e.target.value)}
        />

        <label className="field-with-toggle">
          <input
            placeholder="Mon service"
            value={form.service}
            onChange={(e) => updateField('service', e.target.value)}
          />
          <span>
            <input
              type="checkbox"
              checked={form.serviceVisible}
              onChange={(e) => updateField('serviceVisible', e.target.checked)}
            />{' '}
            Apparaître dans l'annuaire des services
          </span>
        </label>

        <button type="submit" disabled={sending}>
          {sending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}