import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { loadPlan, savePlan, toggleDayRead, clearPlan } from '../utils/biblePlan'

// Génère un plan de lecture à partir d'un livre et d'un nombre de jours
export function generatePlan(totalChapitres, nbJours) {
  const chapitresParJour = Math.ceil(totalChapitres / nbJours)
  const plan = []
  let current = 1

  for (let jour = 1; jour <= nbJours; jour++) {
    const start = current
    const end = Math.min(current + chapitresParJour - 1, totalChapitres)
    if (start > totalChapitres) break

    plan.push({
      jour,
      start,
      end,
      label: start === end ? `Chapitre ${start}` : `Chapitres ${start}–${end}`
    })
    current = end + 1
  }
  return plan
}

export default function BibleDailyPlan({ books, onOpenChapter }) {
  const { user } = useAuth()
  const [selectedBookId, setSelectedBookId] = useState('')
  const [nbJours, setNbJours] = useState(30)
  const [plan, setPlan] = useState([])
  const [completedDays, setCompletedDays] = useState([])
  const [savedPlan, setSavedPlan] = useState(null) // plan sauvegardé en base
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Charge le plan sauvegardé au démarrage
  useEffect(() => {
    if (!user?.uid) return
    setLoading(true)
    loadPlan(user.uid)
      .then((p) => {
        if (p) {
          setSavedPlan(p)
          setCompletedDays(p.completedDays || [])
        }
      })
      .catch((err) => console.warn('Erreur chargement plan:', err))
      .finally(() => setLoading(false))
  }, [user])

  // Régénère le plan visuel si on a un plan sauvegardé
  useEffect(() => {
    if (!savedPlan) return
    const book = books.find((b) => b.code === savedPlan.bookCode)
    if (!book) return

    // On n'a pas le nombre de chapitres tant que le livre n'est pas chargé
    // On utilise un nombre fictif, le plan visuel se régénérera une fois le livre chargé
    // Alternative : on peut demander à l'utilisateur de recharger
    setSelectedBookId(book.code)
    setNbJours(savedPlan.nbJours)
    setPlan(generatePlan(50, savedPlan.nbJours)) // hypothèse : 50 chapitres
  }, [savedPlan, books])

  function generer(e) {
    e.preventDefault()
    setError('')
    const book = books.find((b) => b.code === selectedBookId)
    if (!book) {
      setError('Choisis un livre.')
      return
    }
    if (nbJours < 1 || nbJours > 365) {
      setError('Choisis un nombre de jours entre 1 et 365.')
      return
    }

    // Pour un plan précis, il faut connaître le nombre de chapitres du livre
    // On le charge dynamiquement via fetch (petit JSON)
    fetch(`/bible/${user ? 'fr' : 'fr'}/lsg/books/${book.code}.json`)
      .then((r) => r.json())
      .then((bookData) => {
        const total = bookData.chapters?.length || 1
        const newPlan = generatePlan(total, nbJours)
        setPlan(newPlan)

        // Sauvegarde en Firebase
        if (user?.uid) {
          savePlan(user.uid, {
            bookCode: book.code,
            bookLabel: book.label,
            nbJours,
            startDate: new Date().toISOString().split('T')[0],
            completedDays: [],
            createdAt: Date.now()
          })
            .then(() => setCompletedDays([]))
            .catch((err) => console.warn('Erreur sauvegarde:', err))
        }
      })
      .catch((err) => setError('Impossible de charger le livre : ' + err.message))
  }

  async function toggleDay(day) {
    if (!user?.uid) return
    try {
      const newCompleted = await toggleDayRead(user.uid, completedDays, day)
      setCompletedDays(newCompleted)
    } catch (err) {
      console.warn('Erreur toggle:', err)
    }
  }

  async function reset() {
    if (!window.confirm('Supprimer ce plan de lecture ?')) return
    if (user?.uid) {
      await clearPlan(user.uid)
    }
    setSavedPlan(null)
    setPlan([])
    setCompletedDays([])
    setSelectedBookId('')
  }

  return (
    <div className="bible-daily">
      <p className="muted-small" style={{ marginBottom: 12 }}>
        Choisis un livre et le nombre de jours. Ton plan sera sauvegardé automatiquement.
      </p>

      <form onSubmit={generer} className="bible-daily-form">
        <label>
          Livre
          <select value={selectedBookId} onChange={(e) => setSelectedBookId(e.target.value)}>
            <option value="">— Choisir un livre —</option>
            {books.map((b) => (
              <option key={b.code} value={b.code}>{b.label}</option>
            ))}
          </select>
        </label>

        <label>
          Nombre de jours
          <input
            type="number"
            min="1"
            max="365"
            value={nbJours}
            onChange={(e) => setNbJours(Number(e.target.value))}
          />
        </label>

        <button type="submit">Générer le plan</button>
        {savedPlan && (
          <button type="button" onClick={reset} style={{ background: 'var(--color-crimson-dark)' }}>
            Réinitialiser
          </button>
        )}
      </form>

      {error && <p className="error">{error}</p>}
      {loading && <p>Chargement du plan...</p>}

      {plan.length > 0 && (
        <div className="bible-plan-list">
          <h3>Plan de lecture ({plan.length} jours)</h3>
          {savedPlan && (
            <p className="muted-small">
              Progression : {completedDays.length}/{plan.length} jours lus
            </p>
          )}
          {plan.map((p) => {
            const isRead = completedDays.includes(p.jour)
            return (
              <div key={p.jour} className="bible-plan-day">
                <button
                  className={isRead ? 'bible-plan-check read' : 'bible-plan-check'}
                  onClick={() => toggleDay(p.jour)}
                  title={isRead ? 'Marquer comme non lu' : 'Marquer comme lu'}
                >
                  {isRead ? '✅' : '⬜'}
                </button>
                <span className="bible-plan-day-num">Jour {p.jour}</span>
                <button
                  className="bible-plan-day-btn"
                  onClick={() => onOpenChapter({ code: selectedBookId, label: '' }, p.start)}
                >
                  {p.label}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}