import { get, set, del } from 'idb-keyval'

// Charge un livre depuis IndexedDB, ou le télécharge depuis public/
// et le met en cache pour le mode hors ligne
export async function loadBook(langue, version, bookCode) {
  const key = `bible-${langue}-${version}-${bookCode}`

  // 1. Essaie le stockage local d'abord (mode hors ligne)
  try {
    const cached = await get(key)
    if (cached) {
      console.log(`📖 ${bookCode} lu depuis IndexedDB`)
      return cached
    }
  } catch (e) {
    console.warn('Erreur lecture IndexedDB:', e)
  }

  // 2. Sinon, télécharge depuis public/
  console.log(`📥 Téléchargement de ${bookCode}...`)
  const url = `/bible/${langue}/${version}/books/${bookCode}.json`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Livre ${bookCode} introuvable (${res.status})`)
  }
  const book = await res.json()

  // 3. Sauvegarde en local pour la prochaine fois (hors ligne)
  try {
    await set(key, book)
    console.log(`✅ ${bookCode} sauvegardé pour le mode hors ligne`)
  } catch (e) {
    console.warn('Erreur écriture IndexedDB:', e)
  }

  return book
}

// Vide tout le cache Bible (utile pour debug)
export async function clearBibleCache() {
  const keys = ['bible-fr-lsg', 'bible-en-kjv'] // etc.
  for (const k of keys) {
    await del(k)
  }
}

// Vérifie si une version est déjà téléchargée (au moins quelques livres)
export async function isVersionCached(langue, version) {
  const testKey = `bible-${langue}-${version}-Gen`
  const cached = await get(testKey)
  return !!cached
}