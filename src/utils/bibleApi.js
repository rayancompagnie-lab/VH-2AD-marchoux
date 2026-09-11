// API Midvash — structure multilingue
// Les champs name/slug/abbrev sont des objets { fr, en, ... }
const BASE_URL = 'https://api.midvash.com/v1'
const VERSION_FR = 'lsg' // Louis Segond

export async function fetchBooks(testament) {
  const url = `${BASE_URL}/books?testament=${testament}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Erreur API (${res.status})`)
  const json = await res.json()
  return json.data || []
}

// Récupère le nom français d'un livre
export function getBookName(book) {
  if (!book) return ''
  if (typeof book.name === 'string') return book.name
  return book.name?.fr || book.name?.en || 'Livre'
}

// Récupère le slug français d'un livre
export function getBookSlug(book) {
  if (!book) return ''
  if (typeof book.slug === 'string') return book.slug
  return book.slug?.fr || book.slug?.en || ''
}

// Récupère le nombre de chapitres
export function getBookChapters(book) {
  return book?.chapters || 1
}

// Récupère un chapitre complet
export async function fetchChapter(bookSlug, chapter) {
  const url = `${BASE_URL}/${VERSION_FR}/${bookSlug}/${chapter}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Chapitre introuvable (${res.status})`)
  const json = await res.json()
  return json.data
}

// Récupère un verset précis
export async function fetchVerse(bookSlug, chapter, verse) {
  const url = `${BASE_URL}/${VERSION_FR}/${bookSlug}/${chapter}/${verse}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Verset introuvable (${res.status})`)
  const json = await res.json()
  return json.data
}