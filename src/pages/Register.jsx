import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fileToResizedBase64 } from '../utils/images'
import { normalizeIvorianPhone } from '../utils/phone'
import { TRIBUS, STATUTS } from '../utils/groups'
import PasswordField from '../components/PasswordField'

export default function Register() {
  const { registerWithEmail } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [photo1, setPhoto1] = useState(null)
  const [photo2, setPhoto2] = useState(null)
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    sexe: '',
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
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.sexe) {
      setError('Choisis ton sexe.')
      return
    }
    if (!form.contact) {
      setError('Le contact est obligatoire.')
      return
    }
    if (!photo1) {
      setError('Ajoute au moins une photo (obligatoire).')
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
      const photoPrincipale = await fileToResizedBase64(photo1)
      const photoSecondaire = photo2 ? await fileToResizedBase64(photo2) : ''
      await registerWithEmail({
        ...form,
        contact: normalizeIvorianPhone(form.contact),
        photoPrincipale,
        photoSecondaire
      })
      navigate('/')
    } catch (err) {
      setError("Impossible de créer le compte (email déjà utilisé ou mot de passe trop court).")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>Vase d'honneur — 2AD Marchoux</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Inscription</h2>
        {error && <p className="error">{error}</p>}

        <input placeholder="Nom" value={form.nom} onChange={(e) => update('nom', e.target.value)} required />
        <input placeholder="Prénom" value={form.prenom} onChange={(e) => update('prenom', e.target.value)} required />
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        <PasswordField value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} />

        <select value={form.sexe} onChange={(e) => update('sexe', e.target.value)} required>
          <option value="">Choisis ton sexe</option>
          <option value="homme">Homme 🛡️ (Kanegnon)</option>
          <option value="femme">Femme 🌸 (Leaman)</option>
        </select>

        <label className="photo-field">
          Photo de profil (obligatoire)
          <input type="file" accept="image/*" onChange={(e) => setPhoto1(e.target.files[0] || null)} required />
        </label>
        <label className="photo-field">
          Deuxième photo (facultatif)
          <input type="file" accept="image/*" onChange={(e) => setPhoto2(e.target.files[0] || null)} />
        </label>

        <input placeholder="Titre / responsabilité dans l'église (facultatif)" value={form.titre} onChange={(e) => update('titre', e.target.value)} />
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
          <input placeholder="Mon service (ex: chorale, protocole, media...)" value={form.service} onChange={(e) => update('service', e.target.value)} />
          <span>
            <input type="checkbox" checked={form.serviceVisible} onChange={(e) => update('serviceVisible', e.target.checked)} /> Apparaître dans l'annuaire des services
          </span>
        </label>

        <button type="submit" disabled={sending}>{sending ? 'Création du compte...' : 'Créer mon compte'}</button>
        <p>Déjà inscrit ? <Link to="/connexion">Se connecter</Link></p>
      </form>
    </div>
  )
}