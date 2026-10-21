import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { createDelegatedMember } from '../utils/delegatedMembers'
import { TRIBUS } from '../utils/groups'
import AvatarPicker from './AvatarPicker'

export default function PatriarcheCreateMember({ tribuKey, onCreated }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    sexe: '',
    avatarId: '',
    contact: '',
    lieuHabitation: ''
  })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState('')

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'sexe' && value !== f.sexe) next.avatarId = ''
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.sexe) return setError('Choisis le sexe.')
    if (!form.avatarId) return setError('Choisis un avatar.')

    setSending(true)
    try {
      const newUid = await createDelegatedMember({
        ...form,
        tribu: tribuKey,
        createdBy: user.uid
      })
      setSuccess(`✅ Membre créé (tribu ${TRIBUS.find((t) => t.key === tribuKey)?.label}).`)
      setForm({ nom: '', prenom: '', sexe: '', avatarId: '', contact: '', lieuHabitation: '' })
      onCreated?.(newUid)
    } catch (err) {
      setError('Échec : ' + err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="patriarche-create">
      <h4 style={{ color: 'var(--color-teal-dark)' }}>
        ➕ Créer une fiche pour un membre de ma tribu
      </h4>
      <p className="muted-small">
        Ce membre n'a pas de téléphone. Il sera rattaché à ta tribu et pourra être pointé
        présent/absent par toi. Il ne peut pas se connecter à l'application.
      </p>

      <form onSubmit={handleSubmit} className="auth-form" style={{ maxWidth: 480 }}>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <input placeholder="Nom" value={form.nom} onChange={(e) => update('nom', e.target.value)} required />
        <input placeholder="Prénom" value={form.prenom} onChange={(e) => update('prenom', e.target.value)} required />

        <select value={form.sexe} onChange={(e) => update('sexe', e.target.value)} required>
          <option value="">Sexe</option>
          <option value="homme">Homme 🛡️</option>
          <option value="femme">🌸 Femme</option>
        </select>

        <AvatarPicker
          sexe={form.sexe}
          value={form.avatarId}
          onChange={(id) => update('avatarId', id)}
        />

        <input placeholder="Contact (facultatif)" value={form.contact} onChange={(e) => update('contact', e.target.value)} />
        <input placeholder="Lieu d'habitation (facultatif)" value={form.lieuHabitation} onChange={(e) => update('lieuHabitation', e.target.value)} />

        <button type="submit" disabled={sending}>
          {sending ? 'Création...' : 'Créer la fiche'}
        </button>
      </form>
    </div>
  )
}