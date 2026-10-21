import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '../firebase'
import { TRIBUS } from '../utils/groups'
import { listenAllDelegatedMembers, deleteDelegatedMember } from '../utils/delegatedMembers'
import Avatar from './Avatar'

export default function PatriarcheManageTribu() {
  const [tribus, setTribus] = useState({})
  const [delegatedMembers, setDelegatedMembers] = useState([])
  const [selectedTribu, setSelectedTribu] = useState(TRIBUS[0].key)

  useEffect(() => {
    const unsub = onValue(ref(db, 'tribus'), (snap) => setTribus(snap.val() || {}))
    const unsubD = listenAllDelegatedMembers(setDelegatedMembers)
    return () => { unsub(); unsubD() }
  }, [])

  const deleguesOfTribu = delegatedMembers.filter((m) => m.tribu === selectedTribu)

  async function handleDelete(m) {
    if (!window.confirm(`Supprimer définitivement la fiche de ${m.prenom} ${m.nom} ?`)) return
    try {
      await deleteDelegatedMember(m.uid)
    } catch (err) {
      alert('Échec : ' + err.message)
    }
  }

  return (
    <section>
      <h3>👥 Membres délégués par tribu</h3>
      <p className="muted-small">
        Les membres délégués sont créés par leur patriarche. Ils n'ont pas de compte Firebase.
      </p>

      <select
        value={selectedTribu}
        onChange={(e) => setSelectedTribu(e.target.value)}
        style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd6c8', marginBottom: 12 }}
      >
        {TRIBUS.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label} ({delegatedMembers.filter((m) => m.tribu === t.key).length})
          </option>
        ))}
      </select>

      {deleguesOfTribu.length === 0 && <p className="muted-small">Aucun membre délégué.</p>}

      {deleguesOfTribu.map((m) => (
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
          <Avatar avatarId={m.avatarId} size={32} name={m.prenom} />
          <span style={{ flex: 1, fontSize: 14 }}>
            {m.prenom} {m.nom}
            {m.contact && <em className="muted-small"> — {m.contact}</em>}
          </span>
          <button
            onClick={() => handleDelete(m)}
            style={{
              background: 'var(--color-crimson-dark)',
              color: 'white',
              border: 'none',
              padding: '4px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Supprimer
          </button>
        </div>
      ))}
    </section>
  )
}