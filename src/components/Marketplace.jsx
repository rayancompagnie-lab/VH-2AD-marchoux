import { useEffect, useState } from 'react'
import { onValue, push, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { fileToResizedBase64, isImageTooLarge } from '../utils/images'
import { PREMIUM_WHATSAPP, toWhatsappLink } from '../utils/whatsapp'
import PremiumBadge from './PremiumBadge'
import Avatar from './Avatar'

const FREE_LIMIT = 5
const PREMIUM_LIMIT = 20
const MAX_IMAGES = 2
const MAX_IMAGE_KO = 200 // 200 Ko max par image après compression

export default function Marketplace() {
  const { user, profile, isPremium, canManage } = useAuth()
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
    setError('')
    const files = Array.from(e.target.files).slice(0, MAX_IMAGES)

    try {
      const base64s = await Promise.all(
        files.map((f) => fileToResizedBase64(f, 800, 0.7))
      )

      // Vérifier la taille de chaque image
      for (const b64 of base64s) {
        if (isImageTooLarge(b64, MAX_IMAGE_KO)) {
          setError(`Une image est trop lourde (max ${MAX_IMAGE_KO} Ko). Choisis une image plus simple.`)
          setImages([])
          return
        }
      }

      setImages(base64s)
    } catch (err) {
      setError('Impossible de traiter les images : ' + err.message)
      setImages([])
    }
  }

  function removeImage(index) {
    setImages((arr) => arr.filter((_, i) => i !== index))
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
        authorAvatarId: profile?.avatarId || '',
        authorContact: profile?.contact || '',
        authorPremium: isPremium,
        titre,
        description,
        images: images.length > 0 ? images : null,
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

          <label className="photo-field">
            Ajoute jusqu'à {MAX_IMAGES} photo(s) — elles seront compressées automatiquement
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              disabled={images.length >= MAX_IMAGES}
            />
          </label>

          {images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {images.map((img, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img
                    src={img}
                    alt={`Aperçu ${i + 1}`}
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '2px solid var(--color-gold)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    title="Retirer cette image"
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'var(--color-crimson)',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      lineHeight: 1
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

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
            {a.images && a.images.length > 0 && (
              <div className="market-gallery">
                {a.images.map((img, i) => (
                  <img key={i} src={img} alt={a.titre} className="market-image-large" />
                ))}
              </div>
            )}
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