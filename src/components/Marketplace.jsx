import { useEffect, useState } from 'react'
import { onValue, push, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { fileToResizedBase64 } from '../utils/images'
import PremiumBadge from './PremiumBadge'

const FREE_LIMIT = 5
const PREMIUM_LIMIT = 20
const PREMIUM_WHATSAPP = '2250160672966' // +225 01 60 67 29 66

function toWhatsappLink(contact, message) {
  const digits = String(contact || '').replace(/[^\d]/g, '')
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${text}`
}

export default function Marketplace() {
  const { user, profile, isPremium, isAdmin, canManage } = useAuth()
  const [articles, setArticles] = useState([])
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState([])
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

  async function handleImagesChange(e) {
    const files = Array.from(e.target.files).slice(0, 3)
    const base64s = await Promise.all(files.map((f) => fileToResizedBase64(f, 800, 0.75)))
    setImages(base64s)
  }

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
        authorContact: profile?.contact || '',
        authorPremium: isPremium,
        titre,
        description,
        images,
        createdAt: Date.now()
      })
      setTitre('')
      setDescription('')
      setImages([])
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
          <input type="file" accept="image/*" multiple onChange={handleImagesChange} />
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
            {a.images?.length > 0 && (
              <div className="market-gallery">
                {a.images.map((img, i) => (
                  <img key={i} src={img} alt={a.titre} className="market-image-large" />
                ))}
              </div>
            )}
            <div className="market-card-body">
              <h3>
                {a.titre} {a.authorPremium && <PremiumBadge show />}
              </h3>
              <p className="market-author">Par {a.authorName}</p>
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
