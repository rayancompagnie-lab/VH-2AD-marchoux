import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { findTribu, findStatut } from '../utils/groups'
import Badge from './Badge'
import PremiumBadge from './PremiumBadge'

function toWhatsappLink(contact) {
  const digits = String(contact || '').replace(/[^\d+]/g, '').replace('+', '')
  return `https://wa.me/${digits}`
}

function orAucun(value) {
  return value && value.trim() ? value : 'Aucun'
}

export default function ServiceDirectory() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [badges, setBadges] = useState({})
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const unsubUsers = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val() || {}
      const list = Object.entries(data)
        .map(([uid, u]) => ({ uid, ...u }))
        .filter((u) => u.serviceVisible && u.service)
        .sort((a, b) => {
          const aPremium = !!a.premium || a.role === 'admin'
          const bPremium = !!b.premium || b.role === 'admin'
          return bPremium - aPremium
        })
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
          const tribu = findTribu(m.tribu)
          const statut = findStatut(m.statutRelationnel)
          return (
            <div key={m.uid} className="member-card">
              <div className="member-card-body" onClick={() => setSelected(m)} role="button" tabIndex={0}>
                {m.photoPrincipale && <img src={m.photoPrincipale} alt={`${m.prenom} ${m.nom}`} className="member-avatar" />}
                <h3>
                  {m.prenom} {m.nom}{' '}
                  <PremiumBadge show={premium} canRequest={!premium && m.uid === user?.uid} name={`${m.prenom} ${m.nom}`} />
                </h3>
                <p className="titre">{orAucun(m.titre)}</p>
                <p className="service">{m.service}</p>
                <p className="contact">{m.contact}</p>
                <p className="lieu">{orAucun(m.lieuHabitation)}</p>
                <div className="badges">
                  {tribu && <span className="badge-pill" style={{ background: tribu.color }}>{tribu.label}</span>}
                  {statut && <span className="badge-pill" style={{ background: statut.color }}>{statut.label}</span>}
                  {Object.keys(m.badges || {}).map((bId) => (
                    <Badge key={bId} badge={badges[bId]} />
                  ))}
                </div>
                <p className="see-more">Voir la fiche complète →</p>
              </div>
              <a className="contact-btn" href={toWhatsappLink(m.contact)} target="_blank" rel="noreferrer">
                Contacter sur WhatsApp
              </a>
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            <h3>{selected.prenom} {selected.nom}</h3>
            <div className="modal-photos">
              {selected.photoPrincipale && <img src={selected.photoPrincipale} alt="Photo principale" />}
              {selected.photoSecondaire && <img src={selected.photoSecondaire} alt="Deuxième photo" />}
            </div>
            <p><strong>Titre / responsabilité :</strong> {orAucun(selected.titre)}</p>
            <p><strong>Travail / expérience :</strong> {orAucun(selected.experience)}</p>
            <p><strong>Service :</strong> {orAucun(selected.service)}</p>
            <p><strong>Contact :</strong> {selected.contact}</p>
            <p><strong>Lieu d'habitation :</strong> {orAucun(selected.lieuHabitation)}</p>
            <div className="badges">
              {findTribu(selected.tribu) && (
                <span className="badge-pill" style={{ background: findTribu(selected.tribu).color }}>
                  {findTribu(selected.tribu).label}
                </span>
              )}
              {findStatut(selected.statutRelationnel) && (
                <span className="badge-pill" style={{ background: findStatut(selected.statutRelationnel).color }}>
                  {findStatut(selected.statutRelationnel).label}
                </span>
              )}
              {Object.keys(selected.badges || {}).map((bId) => (
                <Badge key={bId} badge={badges[bId]} />
              ))}
            </div>
            <a className="contact-btn" href={toWhatsappLink(selected.contact)} target="_blank" rel="noreferrer">
              Contacter sur WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
