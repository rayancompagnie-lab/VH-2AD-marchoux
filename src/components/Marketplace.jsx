import { useEffect, useState } from 'react'
import { onValue, push, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { PREMIUM_WHATSAPP, toWhatsappLink } from '../utils/whatsapp'
import PremiumBadge from './PremiumBadge'
import Avatar from './Avatar'

const FREE_LIMIT = 5
const PREMIUM_LIMIT = 20

export default function Marketplace() {
  const { user, profile, isPremium, canManage } = useAuth()
  const [articles, setArticles] = useState([])
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const unsubscribe = onValue(
      ref(db, 'marche'),
      (snap) => {
        const data = snap.val() || {}
        const list = Object.entries(data)
          .map(([id, a]) => ({ id, ...a }))
          .sort((a, b) => {
            const premiumDiff = (b.authorPremium ? 1 : 0) - (a.authorPremium ? 1 : 0)
            if (premiumDiff !== 0) return premiumDiff
            return (b.createdAt || 0) - (a.createdAt || 0)
          })
        setArticles(list)
      },
      (err) => setError('Impossible de charger le Marché : ' + err.message)
    )
    return unsubscribe
  }, [])

  const myArticles = articles.filter((a) => a.authorUid === user?.uid)
  const limit = isPremium ? PREMIUM_LIMIT : FREE_LIMIT
  const reachedLimit = myArticles.length >= limit

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!titre || !description) {
      setError('Titre et description obligatoires.')
      return
    }
    if (reachedLimit) return
    setSending(true)
    try {
      const newRef = push(ref(db, 'marche'))
      await set(newRef, {
        authorUid: user.uid,
        authorName: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        authorAvatarId: profile?.avatarId || '',
        authorContact: profile?.contact || '',
        authorPremium: isPremium,
        titre,
        description,
        createdAt: Date.now()
      })
      setTitre('')
      setDescription('')
    } catch (err) {
      setError('Échec de la publication : ' + err.message)
    } finally {
      setSending(false)
    }
  }

  async function deleteArticle(id) {
    if (!window.confirm('Supprimer définitivement cet article ?')) return
    try {
      await remove(ref(db, `marche/${id}`))
    } catch (err) {
      setError('Échec de la suppression : ' + err.message)
    }
  }

  return (
    <div className="marketplace">
      <h2>Marché</h2>

      {!reachedLimit ? (
        <form onSubmit={handleSubmit} className="post-composer">
          {error && <p className="error">{error}</p>}
          <input placeholder="Titre de l'article" value={titre} onChange={(e) => setTitre(e.target.value)} />
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <p className="muted-small">
            {myArticles.length}/{limit} articles publiés {isPremium && <PremiumBadge show />}
          </p>
          <button type="submit" disabled={sending}>{sending ? 'Publication...' : "Publier l'article"}</button>
        </form>
      ) : (
        <div className="premium-cta">
          {error && <p className="error">{error}</p>}
          <p>Tu as atteint tes {limit} articles {isPremium ? 'Premium' : 'gratuits'} sur le Marché.</p>
          {!isPremium && (
            <>
              <p>Passe au mode <strong>Premium</strong> (1000 FCFA/mois) pour publier jusqu'à {PREMIUM_LIMIT} articles, avec un badge ⭐ à côté de ton nom.</p>
              <a
                className="contact-btn"
                href={toWhatsappLink(
                  PREMIUM_WHATSAPP,
                  `Bonjour, je souhaite passer au mode Premium sur Vase d'honneur (compte : ${profile?.prenom} ${profile?.nom}).`
                )}
                target="_blank"
                rel="noreferrer"
              >
                Passer en Premium sur WhatsApp
              </a>
            </>
          )}
        </div>
      )}

      <div className="market-feed">
        {articles.length === 0 && <p>Aucun article publié pour le moment.</p>}
        {articles.map((a) => (
          <div key={a.id} className="market-card-large">
            <div className="market-card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar avatarId={a.authorAvatarId} size={40} name={a.authorName} />
                <div>
                  <h3 style={{ margin: 0 }}>
                    {a.titre} {a.authorPremium && <PremiumBadge show />}
                  </h3>
                  <p className="market-author" style={{ margin: 0 }}>Par {a.authorName}</p>
                </div>
              </div>
              <p className="market-description">{a.description}</p>
            </div>
            {a.authorContact && (
              <a
                className="order-btn"
                href={toWhatsappLink(a.authorContact, `Bonjour, je suis intéressé(e) par "${a.titre}" vu sur Vase d'honneur.`)}
                target="_blank"
                rel="noreferrer"
              >
                🛒 Commander sur WhatsApp
              </a>
            )}
            {(a.authorUid === user?.uid || canManage('marche')) && (
              <button className="delete-btn" onClick={() => deleteArticle(a.id)}>Supprimer</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}