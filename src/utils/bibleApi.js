// API Midvash — gratuite, sans clé, CORS ouvert
// Documentation : https://api.midvash.com/fr
const BASE_URL = 'https://api.midvash.com/v1'

// Version de la Bible en français (Louis Segond 1910)
const VERSION_FR = 'lsg'

// Récupère les 66 livres de la Bible, filtrés par testament
// testament = 'old' | 'new'
export async function fetchBooks(testament) {
  const url = `${BASE_URL}/books?testament=${testament}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Erreur API (${res.status})`)
  const json = await res.json()
  return json.data || []
}

// Récupère un chapitre complet
// bookSlug : slug du livre en français (ex: 'jean', 'genese', 'psaumes')
// chapter : numéro du chapitre
export async function fetchChapter(bookSlug, chapter) {
  const url = `${BASE_URL}/${VERSION_FR}/${bookSlug}/${chapter}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Chapitre introuvable (${res.status})`)
  const json = await res.json()
  return json.data
}

// Récupère un verset précis
// verse peut être un nombre ou une plage "16-18"
export async function fetchVerse(bookSlug, chapter, verse) {
  const url = `${BASE_URL}/${VERSION_FR}/${bookSlug}/${chapter}/${verse}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Verset introuvable (${res.status})`)
  const json = await res.json()
  return json.data
}

// Récupère les métadonnées d'un livre (nombre de chapitres)
export async function fetchBookMeta(bookSlug) {
  const url = `${BASE_URL}/books/${bookSlug}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Livre introuvable (${res.status})`)
  const json = await res.json()
  return json.data
}