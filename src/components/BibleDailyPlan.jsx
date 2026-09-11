import { useState } from 'react'

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
  const [selectedBookId, setSelectedBookId] = useState('')
  const [nbJours, setNbJours] = useState(30)
  const [plan, setPlan] = useState([])
  const [error, setError] = useState('')

  const selectedBook = books.find((b) => String(b.id) === String(selectedBookId)) || null

  function generer(e) {
    e.preventDefault()
    setError('')
    if (!selectedBook) {
      setError('Choisis un livre.')
      return
    }
    if (nbJours < 1 || nbJours > 365) {
      setError('Choisis un nombre de jours entre 1 et 365.')
      return
    }
    const totalChapitres = selectedBook.chapters || 1
    setPlan(generatePlan(totalChapitres, nbJours))
  }

  return (
    <div className="bible-daily">
      <p className="muted-small" style={{ marginBottom: 12 }}>
        Choisis un livre et le nombre de jours. Le plan sera généré automatiquement.
      </p>

      <form onSubmit={generer} className="bible-daily-form">
        <label>
          Livre
          <select
            value={selectedBookId}
            onChange={(e) => {
              setSelectedBookId(e.target.value)
              setPlan([])
            }}
          >
            <option value="">— Choisir un livre —</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name?.fr || b.name?.en}
              </option>
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
      </form>

      {error && <p className="error">{error}</p>}

      {plan.length > 0 && selectedBook && (
        <div className="bible-plan-list">
          <h3>
            Plan de lecture — {selectedBook.name?.fr || selectedBook.name?.en} ({plan.length} jours)
          </h3>
          {plan.map((p) => (
            <div key={p.jour} className="bible-plan-day">
              <span className="bible-plan-day-num">Jour {p.jour}</span>
              <button
                className="bible-plan-day-btn"
                onClick={() => onOpenChapter(selectedBook, p.start)}
              >
                {p.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}