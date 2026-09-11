import { useEffect, useState } from 'react'
import { fetchBooks, fetchChapter, getBookName, getBookSlug, getBookChapters } from '../utils/bibleApi'

const SOUS_ONGLETS = [
  { key: 'ancien', label: 'Ancien Testament', testament: 'old' },
  { key: 'nouveau', label: 'Nouveau Testament', testament: 'new' },
  { key: 'quotidien', label: 'Lecture quotidienne', testament: null }
]

// Récupère le texte d'un verset (gère string ou objet multilingue)
function getVerseText(v) {
  if (!v) return ''
  if (typeof v.text === 'string') return v.text
  if (v.text && typeof v.text === 'object') {
    return v.text.fr || v.text.en || Object.values(v.text)[0] || ''
  }
  return ''
}

export default function Bible() {
  const [sousOnglet, setSousOnglet] = useState('ancien')
  const [books, setBooks] = useState([])
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [error, setError] = useState('')

  const [selectedBook, setSelectedBook] = useState(null)
  const [chapter, setChapter] = useState(1)
  const [chapterData, setChapterData] = useState(null)
  const [loadingChapter, setLoadingChapter] = useState(false)

  useEffect(() => {
    if (sousOnglet === 'quotidien') return
    const testament = SOUS_ONGLETS.find((s) => s.key === sousOnglet)?.testament
    if (!testament) return

    setLoadingBooks(true)
    setError('')
    fetchBooks(testament)
      .then((list) => setBooks(list))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingBooks(false))
  }, [sousOnglet])

  useEffect(() => {
    if (!selectedBook) return
    setLoadingChapter(true)
    setError('')
    fetchChapter(getBookSlug(selectedBook), chapter)
      .then((data) => setChapterData(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingChapter(false))
  }, [selectedBook, chapter])

  function openBook(book) {
    setSelectedBook(book)
    setChapter(1)
  }

  function fermerLecture() {
    setSelectedBook(null)
    setChapterData(null)
  }

  // ─── Vue lecture ───
  if (selectedBook) {
    const totalChapitres = getBookChapters(selectedBook)
    const verses = chapterData?.verses || chapterData?.verses_list || []

    return (
      <div className="bible-reader">
        <button className="bible-back" onClick={fermerLecture}>← Retour aux livres</button>

        <h2>{getBookName(selectedBook)}</h2>

        <div className="bible-nav">
          <button
            disabled={chapter <= 1}
            onClick={() => setChapter((c) => Math.max(1, c - 1))}
          >
            ← Précédent
          </button>

          <select value={chapter} onChange={(e) => setChapter(Number(e.target.value))}>
            {Array.from({ length: totalChapitres }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>Chapitre {n}</option>
            ))}
          </select>

          <button
            disabled={chapter >= totalChapitres}
            onClick={() => setChapter((c) => Math.min(totalChapitres, c + 1))}
          >
            Suivant →
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {loadingChapter && <p>Chargement...</p>}

        {chapterData && (
          <div className="bible-chapter">
            <h3>Chapitre {chapter}</h3>
            <div className="bible-verses">
              {verses.length === 0 && <p>Aucun verset trouvé.</p>}
              {verses.map((v, i) => (
                <p key={v.number || i} className="bible-verse">
                  <sup>{v.number || i + 1}</sup> {getVerseText(v)}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Vue liste / quotidien ───
  return (
    <div className="bible-page">
      <h2>📖 Bible</h2>

      <div className="bible-subtabs">
        {SOUS_ONGLETS.map((s) => (
          <button
            key={s.key}
            className={sousOnglet === s.key ? 'bible-subtab active' : 'bible-subtab'}
            onClick={() => setSousOnglet(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sousOnglet === 'quotidien' && (
        <div className="bible-daily">
          <p className="muted-small">
            Choisis un livre et le nombre de jours pour générer ton plan de lecture.
          </p>
          <p>Fonctionnalité à venir.</p>
        </div>
      )}

      {sousOnglet !== 'quotidien' && (
        <>
          {error && <p className="error">{error}</p>}
          {loadingBooks && <p>Chargement des livres...</p>}

          <div className="bible-books">
            {books.map((b) => (
              <button
                key={b.id}
                className="bible-book"
                onClick={() => openBook(b)}
              >
                {getBookName(b)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}