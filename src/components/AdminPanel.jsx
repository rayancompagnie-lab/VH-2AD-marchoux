import { useEffect, useState } from 'react'
import { onValue, push, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { TRIBUS } from '../utils/groups'
import {
  listenAllPatriarches,
  setPatriarche,
  removePatriarche
} from '../utils/patriarches'
import Badge from './Badge'
import Avatar from './Avatar'
import ProgCulte from './ProgCulte'
import PatriarcheManageTribu from './PatriarcheManageTribu'

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
  const [patriarchesMap, setPatriarchesMap] = useState({})
  const [badgeName, setBadgeName] = useState('')
  const [color1, setColor1] = useState('#6b46c1')
  const [color2, setColor2] = useState('')

  useEffect(() => {
    const unsubUsers = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val() || {}
      setUsers(Object.entries(data).map(([uid, u]) => ({ uid, ...u })))
    })
    const unsubBadges = onValue(ref(db, 'badges'), (snap) => setBadges(snap.val() || {}))
    const unsubPatriarches = listenAllPatriarches(setPatriarchesMap)
    return () => {
      unsubUsers()
      unsubBadges()
      unsubPatriarches()
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
    if (!window.confirm(`Supprimer définitivement le badge "${name}" ?`)) return
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
      `⚠️ Pense aussi à supprimer son compte dans Firebase Authentication.`
    )
    if (!ok) return
    await remove(ref(db, `users/${uid}`))
  }

  async function assignPatriarche(tribuKey, uid) {
    if (uid === '') {
      if (!window.confirm(`Retirer le patriarche de la tribu ${tribuKey} ?`)) return
      await removePatriarche(tribuKey)
    } else {
      await setPatriarche(tribuKey, uid)
    }
  }

  // Membres groupés par tribu (pour le sélecteur de patriarche)
  const tribusUsers = {}
  for (const u of users) {
    if (u.tribu) {
      if (!tribusUsers[u.tribu]) tribusUsers[u.tribu] = []
      tribusUsers[u.tribu].push(u)
    }
  }

  return (
    <div className="admin-panel">
      <h2>Administration</h2>

      {/* 1. PATRIARCHES */}
      <section>
        <h3>👑 Désigner les Patriarches</h3>
        <p className="muted-small">
          Un seul patriarche par tribu. Il pourra faire l'appel de sa tribu et créer des
          fiches pour les membres sans téléphone.
        </p>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tribu</th>
              <th>Patriarche actuel</th>
              <th>Désigner</th>
            </tr>
          </thead>
          <tbody>
            {TRIBUS.map((t) => {
              const currentUid = patriarchesMap[t.key] || ''
              const currentUser = users.find((u) => u.uid === currentUid)
              return (
                <tr key={t.key}>
                  <td><strong>{t.label}</strong></td>
                  <td>
                    {currentUser
                      ? `${currentUser.prenom} ${currentUser.nom}`
                      : <em className="muted-small">Non désigné</em>}
                  </td>
                  <td>
                    <select
                      value={currentUid}
                      onChange={(e) => assignPatriarche(t.key, e.target.value)}
                    >
                      <option value="">— Aucun —</option>
                      {(tribusUsers[t.key] || []).map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.prenom} {u.nom}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* 2. PROGRAMMER UN CULTE */}
      <ProgCulte />

      {/* 3. MEMBRES DÉLÉGUÉS */}
      <PatriarcheManageTribu />

      {/* 4. BADGES */}
      <section>
        <h3>Créer un badge</h3>
        <form onSubmit={createBadge} className="badge-form">
          <input
            placeholder="Nom du badge (ex: Chorale)"
            value={badgeName}
            onChange={(e) => setBadgeName(e.target.value)}
          />
          <input type="color" value={color1} onChange={(e) => setColor1(e.target.value)} />
          <input
            type="color"
            value={color2}
            onChange={(e) => setColor2(e.target.value)}
            title="Deuxième couleur (facultatif)"
          />
          <button type="submit">Créer</button>
        </form>
        <div className="badges-list">
          {Object.entries(badges).map(([id, b]) => (
            <span key={id} className="badge-with-delete">
              <Badge badge={b} />
              <button
                className="badge-delete-x"
                onClick={() => deleteBadge(id, b.name)}
                title="Supprimer ce badge"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </section>

      {/* 5. MEMBRES, RÔLES, SECTEURS, BADGES */}
      <section>
        <h3>Membres, rôles, secteurs et badges</h3>
        <p className="muted-small">
          Un semi-admin ne peut gérer que les secteurs cochés pour lui. Le Premium peut
          être donné à n'importe quel membre.
        </p>
        <table className="admin-table">
          <thead>
            <tr>
              <th></th>
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
                <td><Avatar avatarId={u.avatarId} size={32} name={u.prenom} /></td>
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
                        <input
                          type="checkbox"
                          checked={has}
                          onChange={() => toggleBadge(u.uid, id, has)}
                        />
                        {b.name}
                      </label>
                    )
                  })}
                </td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => deleteMember(u.uid, `${u.prenom} ${u.nom}`)}
                  >
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
