import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import Badge from './Badge'
import PremiumBadge from './PremiumBadge'

function toWhatsappLink(contact) {
  const digits = String(contact || '').replace(/[^\d+]/g, '').replace('+', '')
  return `https://wa.me/${digits}`
}

export default function ServiceDirectory() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [badges, setBadges] = useState({})

  useEffect(() => {
    const unsubUsers = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val() || {}
      const list = Object.entries(data)
        .map(([uid, u]) => ({ uid, ...u }))
        .filter((u) => u.serviceVisible && u.service)
      setMembers(list)
    })
    const unsubBadges = onValue(ref(db, 'badges'), (snap) => setBadges(snap.val() || {}))
    return () => {
      unsubUsers()
      unsubBadges()
    }
  }, [])

  return (
    <div className="service-directory">
      <h2>Annuaire des services</h2>
      {members.length === 0 && <p>Aucun membre n'a encore publié son service.</p>}
      <div className="member-grid">
        {members.map((m) => {
          const premium = !!m.premium || m.role === 'admin'
          return (
            <div key={m.uid} className="member-card">
              <div className="member-card-body">
                {m.photoPrincipale && <img src={m.photoPrincipale} alt={`${m.prenom} ${m.nom}`} className="member-avatar" />}
                <h3>
                  {m.prenom} {m.nom}{' '}
                  <PremiumBadge show={premium} canRequest={!premium && m.uid === user?.uid} name={`${m.prenom} ${m.nom}`} />
                </h3>
                {m.titre && <p className="titre">{m.titre}</p>}
                <p className="service">{m.service}</p>
                {m.contactVisible && <p className="contact">{m.contact}</p>}
                {m.lieuVisible && m.lieuHabitation && <p className="lieu">{m.lieuHabitation}</p>}
                <div className="badges">
                  {Object.keys(m.badges || {}).map((bId) => (
                    <Badge key={bId} badge={badges[bId]} />
                  ))}
                </div>
              </div>
              <a className="contact-btn" href={toWhatsappLink(m.contact)} target="_blank" rel="noreferrer">
                Contacter sur WhatsApp
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
