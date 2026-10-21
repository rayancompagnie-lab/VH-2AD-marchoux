import { get, set, del, keys } from 'idb-keyval'

export async function loadBook(langue, version, bookCode) {
  const key = `bible-${langue}-${version}-${bookCode}`
  try {
    const cached = await get(key)
    if (cached) return cached
  } catch (e) { console.warn(e) }

  const url = `/bible/${langue}/${version}/books/${bookCode}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Livre ${bookCode} introuvable`)
  const book = await res.json()

  try {
    // ✅ SÉCURITÉ : On garde max 10 livres en cache pour ne pas saturer le téléphone
    const allKeys = await keys()
    const bibleKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('bible-'))
    if (bibleKeys.length > 10) {
      await del(bibleKeys[0]) // Supprime le plus vieux livre
    }
    await set(key, book)
  } catch (e) { console.warn(e) }

  return book
}

export async function clearBibleCache() {
  const allKeys = await keys()
  const bibleKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('bible-'))
  for (const k of bibleKeys) await del(k)
}