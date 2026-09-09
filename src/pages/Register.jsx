import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fileToResizedBase64 } from '../utils/images'
import { normalizeIvorianPhone } from '../utils/phone'
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
    titre: '',
    experience: '',
    contact: '',
    contactVisible: true,
    lieuHabitation: '',
    lieuVisible: false,
    service: '',
    serviceVisible: true
  })

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.contact) {
      setError('Le contact est obligatoire.')
      return
    }
    if (!photo1) {
      setError('Ajoute au moins une photo (obligatoire).')
      return
    }
    setSending(true)
    try {
      const photoPrincipale = await fileToResizedBase64(photo1)
      const photoSecondaire = photo2 ? await fileToResizedBase64(photo2) : ''
      await registerWithEmail({ ...form, contact: normalizeIvorianPhone(form.contact), photoPrincipale, photoSecondaire })
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

        <label className="field-with-toggle">
          <input placeholder="Contact WhatsApp (obligatoire), ex: 0102030405" value={form.contact} onChange={(e) => update('contact', e.target.value)} required />
          <span>
            <input type="checkbox" checked={form.contactVisible} onChange={(e) => update('contactVisible', e.target.checked)} /> Afficher mon contact publiquement
          </span>
        </label>

        <label className="field-with-toggle">
          <input placeholder="Lieu d'habitation (facultatif)" value={form.lieuHabitation} onChange={(e) => update('lieuHabitation', e.target.value)} />
          <span>
            <input type="checkbox" checked={form.lieuVisible} onChange={(e) => update('lieuVisible', e.target.checked)} /> Afficher mon lieu d'habitation
          </span>
        </label>

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
