import { useState } from 'react'
import { ref, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { fileToResizedBase64 } from '../utils/images'
import { normalizeIvorianPhone } from '../utils/phone'
import { findTribu, findStatut } from '../utils/groups'
import PremiumBadge from '../components/PremiumBadge'

export default function MyProfile() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({
    titre: profile?.titre || '',
    experience: profile?.experience || '',
    contact: profile?.contact || '',
    lieuHabitation: profile?.lieuHabitation || '',
    service: profile?.service || '',
    serviceVisible: !!profile?.serviceVisible
  })
  const [newPhoto1, setNewPhoto1] = useState(null)
  const [newPhoto2, setNewPhoto2] = useState(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  function update(field, value) {
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
    setSending(true)
    try {
      const photoPrincipale = newPhoto1 ? await fileToResizedBase64(newPhoto1) : profile.photoPrincipale
      const photoSecondaire = newPhoto2 ? await fileToResizedBase64(newPhoto2) : profile.photoSecondaire
      await set(ref(db, `users/${user.uid}`), { ...profile, ...form, contact: normalizeIvorianPhone(form.contact), photoPrincipale, photoSecondaire })
      setSaved(true)
      setNewPhoto1(null)
      setNewPhoto2(null)
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
        {profile.photoPrincipale && <img src={profile.photoPrincipale} alt="Ma photo" className="profile-avatar" />}
        <p><strong>{profile.prenom} {profile.nom}</strong></p>
        <p className="muted">{profile.email}</p>
        <div className="badges">
          <PremiumBadge show={premium} canRequest={!premium} name={`${profile.prenom} ${profile.nom}`} />
          {tribu && <span className="badge-pill" style={{ background: tribu.color }}>{tribu.label}</span>}
          {statut && <span className="badge-pill" style={{ background: statut.color }}>{statut.label}</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="auth-form profile-form">
        {error && <p className="error">{error}</p>}
        {saved && <p className="success">Profil mis à jour.</p>}

        <label className="photo-field">
          Changer ma photo principale
          <input type="file" accept="image/*" onChange={(e) => setNewPhoto1(e.target.files[0] || null)} />
        </label>
        <label className="photo-field">
          Changer ma deuxième photo
          <input type="file" accept="image/*" onChange={(e) => setNewPhoto2(e.target.files[0] || null)} />
        </label>

        <input placeholder="Titre / responsabilité (facultatif)" value={form.titre} onChange={(e) => update('titre', e.target.value)} />
        <input placeholder="Travail ou expérience (facultatif)" value={form.experience} onChange={(e) => update('experience', e.target.value)} />
        <input placeholder="Contact WhatsApp (obligatoire), ex: 0102030405" value={form.contact} onChange={(e) => update('contact', e.target.value)} required />
        <input placeholder="Lieu d'habitation (facultatif)" value={form.lieuHabitation} onChange={(e) => update('lieuHabitation', e.target.value)} />

        <label className="field-with-toggle">
          <input placeholder="Mon service" value={form.service} onChange={(e) => update('service', e.target.value)} />
          <span><input type="checkbox" checked={form.serviceVisible} onChange={(e) => update('serviceVisible', e.target.checked)} /> Apparaître dans l'annuaire des services</span>
        </label>

        <button type="submit" disabled={sending}>{sending ? 'Enregistrement...' : 'Enregistrer'}</button>
      </form>
    </div>
  )
}
