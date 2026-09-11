import { useEffect, useState } from 'react'
import { fetchBooks, fetchChapter, getBookName, getBookSlug, getBookChapters } from '../utils/bibleApi'
import BibleDailyPlan from '../components/BibleDailyPlan'

const SOUS_ONGLETS = [
  { key: 'ancien', label: 'Ancien Testament', testament: 'old' },
  { key: 'nouveau', label: 'Nouveau Testament', testament: 'new' },
  { key: 'quotidien', label: 'Lecture quotidienne', testament: null }
]

export default function Bible() {
  const [sousOnglet, setSousOnglet] = useState('ancien')
  const [books, setBooks] = useState([])
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [error, setError] = useState('')

  const [selectedBook, setSelectedBook] = useState(null)
  const [chapter, setChapter] = useState(1)
  const [chapterData, setChapterData] = useState(null)
  const [loadingChapter, setLoadingChapter] = useState(false)

  // Charge les livres une seule fois (les 2 testaments)
  useEffect(() => {
    async function loadAll() {
      setLoadingBooks(true)
      setError('')
      try {
        const oldB = await fetchBooks('old')
        const newB = await fetchBooks('new')
        setBooks([...oldB, ...newB])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoadingBooks(false)
      }
    }
    loadAll()
  }, [])

  // Charge un chapitre quand on change de livre ou de chapitre
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
    const verses = chapterData?.verses || []

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
              {verses.map((text, i) => (
                <p key={i} className="bible-verse">
                  <sup>{i + 1}</sup> {text}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Filtre des livres selon le sous-onglet ───
  const booksToShow =
    sousOnglet === 'ancien'
      ? books.filter((b) => b.testament === 'old')
      : sousOnglet === 'nouveau'
        ? books.filter((b) => b.testament === 'new')
        : books

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

      {error && <p className="error">{error}</p>}
      {loadingBooks && <p>Chargement des livres...</p>}

      {sousOnglet === 'quotidien' && (
        <BibleDailyPlan
          books={books}
          onOpenChapter={(book, chapitre) => {
            setSelectedBook(book)
            setChapter(chapitre)
          }}
        />
      )}

      {sousOnglet !== 'quotidien' && (
        <div className="bible-books">
          {booksToShow.map((b) => (
            <button
              key={b.id}
              className="bible-book"
              onClick={() => openBook(b)}
            >
              {getBookName(b)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}