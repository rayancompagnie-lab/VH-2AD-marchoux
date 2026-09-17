import { useEffect, useState } from 'react'
import { loadBook } from '../utils/bibleStorage'
import { getBooksByTestament, getBookLabel } from '../utils/bibleBooks'
import BibleDailyPlan from '../components/BibleDailyPlan'

const VERSIONS = [
  { langue: 'fr', slug: 'lsg', label: 'Louis Segond (FR)' },
  { langue: 'en', slug: 'kjv', label: 'King James Version (EN)' }
]

const SOUS_ONGLETS = [
  { key: 'ancien', label: 'Ancien Testament', testament: 'OT' },
  { key: 'nouveau', label: 'Nouveau Testament', testament: 'NT' },
  { key: 'quotidien', label: 'Lecture quotidienne', testament: null }
]

export default function Bible() {
  const [versionIdx, setVersionIdx] = useState(0)
  const [sousOnglet, setSousOnglet] = useState('ancien')
  const [selectedBook, setSelectedBook] = useState(null)
  const [chapter, setChapter] = useState(1)
  const [chapterData, setChapterData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const version = VERSIONS[versionIdx]
  const langue = version.langue

  // Liste des livres du sous-onglet actif (dépend de la langue)
  const booksOfTab = SOUS_ONGLETS.find((s) => s.key === sousOnglet)?.testament
    ? getBooksByTestament(
        SOUS_ONGLETS.find((s) => s.key === sousOnglet).testament,
        langue
      )
    : []

  // Charge un livre quand on clique dessus
  async function openBook(bookCode) {
    setLoading(true)
    setError('')
    try {
      const book = await loadBook(langue, version.slug, bookCode)
      setSelectedBook(book)
      setChapter(1)
      setChapterData(book.chapters?.[0] || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Change de chapitre
  function goToChapter(num) {
    if (!selectedBook) return
    const ch = selectedBook.chapters?.[num - 1] || null
    setChapter(num)
    setChapterData(ch)
  }

  function fermerLecture() {
    setSelectedBook(null)
    setChapterData(null)
  }

  // Change de version : referme le livre ouvert
  function changeVersion(idx) {
    setVersionIdx(idx)
    setSelectedBook(null)
    setChapterData(null)
  }

  // ─── Vue lecture ───
  if (selectedBook) {
    const totalChapitres = selectedBook.chapters?.length || 1
    const verses = chapterData?.verses || []

    return (
      <div className="bible-reader">
        <button className="bible-back" onClick={fermerLecture}>← Retour aux livres</button>

        <h2>{getBookLabel(selectedBook.book, langue)}</h2>

        <div className="bible-nav">
          <button
            disabled={chapter <= 1}
            onClick={() => goToChapter(chapter - 1)}
          >
            ← Précédent
          </button>

          <select
            value={chapter}
            onChange={(e) => goToChapter(Number(e.target.value))}
          >
            {Array.from({ length: totalChapitres }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>Chapitre {n}</option>
            ))}
          </select>

          <button
            disabled={chapter >= totalChapitres}
            onClick={() => goToChapter(chapter + 1)}
          >
            Suivant →
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {chapterData && (
          <div className="bible-chapter">
            <h3>Chapitre {chapter}</h3>
            <div className="bible-verses">
              {verses.length === 0 && <p>Aucun verset trouvé.</p>}
              {verses.map((v) => (
                <p key={v.number} className="bible-verse">
                  <sup>{v.number}</sup> {v.text}
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

      {/* Sélecteur de version */}
      <div className="bible-versions">
        {VERSIONS.map((v, i) => (
          <button
            key={v.slug}
            className={i === versionIdx ? 'bible-version active' : 'bible-version'}
            onClick={() => changeVersion(i)}
          >
            {v.label}
          </button>
        ))}
      </div>

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
      {loading && <p>Chargement...</p>}

      {sousOnglet === 'quotidien' && (
        <BibleDailyPlan
          books={[
            ...getBooksByTestament('OT', langue),
            ...getBooksByTestament('NT', langue)
          ]}
          onOpenChapter={(book, chapitre) => {
            openBook(book.code).then(() => {
              setTimeout(() => goToChapter(chapitre), 100)
            })
          }}
        />
      )}

      {sousOnglet !== 'quotidien' && (
        <div className="bible-books">
          {booksOfTab.map((b) => (
            <button
              key={b.code}
              className="bible-book"
              onClick={() => openBook(b.code)}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}