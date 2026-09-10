import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { normalizeIvorianPhone } from '../utils/phone'
import { TRIBUS, STATUTS } from '../utils/groups'
import AvatarPicker from '../components/AvatarPicker'

export default function CompleteProfile() {
  const { user, completeMemberProfile } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({
    sexe: '',
    avatarId: '',
    titre: '',
    experience: '',
    contact: '',
    lieuHabitation: '',
    service: '',
    serviceVisible: true,
    tribu: '',
    statutRelationnel: ''
  })

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'sexe' && value !== f.sexe) {
        next.avatarId = ''
      }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.sexe) {
      setError('Choisis ton sexe.')
      return
    }
    if (!form.avatarId) {
      setError('Choisis un avatar.')
      return
    }
    if (!form.contact) {
      setError('Le contact est obligatoire.')
      return
    }
    if (!form.tribu) {
      setError('Choisis ta tribu.')
      return
    }
    if (!form.statutRelationnel) {
      setError('Choisis ton statut.')
      return
    }
    setSending(true)
    try {
      await completeMemberProfile(user.uid, {
        ...form,
        contact: normalizeIvorianPhone(form.contact)
      })
      navigate('/')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>Encore une étape</h1>
      <p>Complète ta fiche membre avant de continuer.</p>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <p className="error">{error}</p>}

        <select value={form.sexe} onChange={(e) => update('sexe', e.target.value)} required>
          <option value="">Choisis ton sexe</option>
          <option value="homme">Homme 🛡️ (Kanegnon)</option>
          <option value="femme">Femme 🌸 (Leaman)</option>
        </select>

        <AvatarPicker
          sexe={form.sexe}
          value={form.avatarId}
          onChange={(id) => update('avatarId', id)}
        />

        <input placeholder="Titre / responsabilité (facultatif)" value={form.titre} onChange={(e) => update('titre', e.target.value)} />
        <input placeholder="Travail ou expérience (facultatif)" value={form.experience} onChange={(e) => update('experience', e.target.value)} />
        <input placeholder="Contact WhatsApp (obligatoire), ex: 0102030405" value={form.contact} onChange={(e) => update('contact', e.target.value)} required />
        <input placeholder="Lieu d'habitation (facultatif)" value={form.lieuHabitation} onChange={(e) => update('lieuHabitation', e.target.value)} />

        <select value={form.tribu} onChange={(e) => update('tribu', e.target.value)} required>
          <option value="">Choisis ta tribu</option>
          {TRIBUS.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>

        <select value={form.statutRelationnel} onChange={(e) => update('statutRelationnel', e.target.value)} required>
          <option value="">Choisis ton statut</option>
          {STATUTS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>

        <label className="field-with-toggle">
          <input placeholder="Mon service" value={form.service} onChange={(e) => update('service', e.target.value)} />
          <span>
            <input type="checkbox" checked={form.serviceVisible} onChange={(e) => update('serviceVisible', e.target.checked)} /> Apparaître dans l'annuaire des services
          </span>
        </label>
        <button type="submit" disabled={sending}>{sending ? 'Validation...' : 'Valider'}</button>
      </form>
    </div>
  )
}