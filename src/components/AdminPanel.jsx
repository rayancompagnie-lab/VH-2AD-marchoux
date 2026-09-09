import { useEffect, useState } from 'react'
import { onValue, push, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import Badge from './Badge'

const SECTEURS = [
  { key: 'actualites', label: 'Actualités' },
  { key: 'infosTravail', label: 'Infos travail' },
  { key: 'marche', label: 'Marché' },
  { key: 'temoignages', label: 'Témoignages' }
]

export default function AdminPanel() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [badges, setBadges] = useState({})
  const [badgeName, setBadgeName] = useState('')
  const [color1, setColor1] = useState('#6b46c1')
  const [color2, setColor2] = useState('')

  useEffect(() => {
    const unsubUsers = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val() || {}
      setUsers(Object.entries(data).map(([uid, u]) => ({ uid, ...u })))
    })
    const unsubBadges = onValue(ref(db, 'badges'), (snap) => setBadges(snap.val() || {}))
    return () => {
      unsubUsers()
      unsubBadges()
    }
  }, [])

  if (!isAdmin) return null

  async function setRole(uid, role) {
    await set(ref(db, `users/${uid}/role`), role)
  }

  async function togglePremium(uid, current) {
    await set(ref(db, `users/${uid}/premium`), !current)
  }

  async function toggleSecteur(uid, secteurKey, current) {
    await set(ref(db, `users/${uid}/secteurs/${secteurKey}`), !current)
  }

  async function createBadge(e) {
    e.preventDefault()
    if (!badgeName) return
    const colors = color2 ? [color1, color2] : [color1]
    await push(ref(db, 'badges'), { name: badgeName, colors })
    setBadgeName('')
    setColor2('')
  }

  async function deleteBadge(id, name) {
    if (!window.confirm(`Supprimer définitivement le badge "${name}" ? Il disparaîtra de tous les membres qui l'ont.`)) return
    await remove(ref(db, `badges/${id}`))
  }

  async function toggleBadge(uid, badgeId, has) {
    if (has) {
      await remove(ref(db, `users/${uid}/badges/${badgeId}`))
    } else {
      await set(ref(db, `users/${uid}/badges/${badgeId}`), true)
    }
  }

  async function deleteMember(uid, nomComplet) {
    const ok = window.confirm(
      `Supprimer définitivement la fiche de ${nomComplet} de la base de données ?\n\n` +
      `⚠️ Si son compte existe encore dans Firebase Authentication, supprime-le aussi là-bas (Authentication > Users), sinon la personne pourra se reconnecter et une fiche vide sera recréée.`
    )
    if (!ok) return
    await remove(ref(db, `users/${uid}`))
  }

  return (
    <div className="admin-panel">
      <h2>Administration</h2>

      <section>
        <h3>Créer un badge</h3>
        <form onSubmit={createBadge} className="badge-form">
          <input placeholder="Nom du badge (ex: Chorale)" value={badgeName} onChange={(e) => setBadgeName(e.target.value)} />
          <input type="color" value={color1} onChange={(e) => setColor1(e.target.value)} />
          <input type="color" value={color2} onChange={(e) => setColor2(e.target.value)} title="Deuxième couleur (facultatif)" />
          <button type="submit">Créer</button>
        </form>
        <div className="badges-list">
          {Object.entries(badges).map(([id, b]) => (
            <span key={id} className="badge-with-delete">
              <Badge badge={b} />
              <button className="badge-delete-x" onClick={() => deleteBadge(id, b.name)} title="Supprimer ce badge">✕</button>
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3>Membres, rôles, secteurs et badges</h3>
        <p className="muted-small">
          Un semi-admin ne peut gérer (publier/supprimer/valider) que les secteurs cochés pour lui. Le Premium peut être
          donné à n'importe quel membre, indépendamment de son rôle.
        </p>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Secteurs (si semi-admin)</th>
              <th>Premium</th>
              <th>Badges</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid}>
                <td>{u.prenom} {u.nom}</td>
                <td>
                  <select value={u.role || 'member'} onChange={(e) => setRole(u.uid, e.target.value)}>
                    <option value="member">Membre</option>
                    <option value="semiAdmin">Semi-admin</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  {u.role === 'semiAdmin' ? (
                    SECTEURS.map((s) => (
                      <label key={s.key} className="badge-checkbox">
                        <input
                          type="checkbox"
                          checked={!!u.secteurs?.[s.key]}
                          onChange={() => toggleSecteur(u.uid, s.key, !!u.secteurs?.[s.key])}
                        />
                        {s.label}
                      </label>
                    ))
                  ) : (
                    <span className="muted-small">—</span>
                  )}
                </td>
                <td>
                  <label className="badge-checkbox">
                    <input
                      type="checkbox"
                      checked={!!u.premium || u.role === 'admin'}
                      disabled={u.role === 'admin'}
                      onChange={() => togglePremium(u.uid, !!u.premium)}
                    />
                    ⭐
                  </label>
                </td>
                <td>
                  {Object.entries(badges).map(([id, b]) => {
                    const has = !!u.badges?.[id]
                    return (
                      <label key={id} className="badge-checkbox">
                        <input type="checkbox" checked={has} onChange={() => toggleBadge(u.uid, id, has)} />
                        {b.name}
                      </label>
                    )
                  })}
                </td>
                <td>
                  <button className="delete-btn" onClick={() => deleteMember(u.uid, `${u.prenom} ${u.nom}`)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
