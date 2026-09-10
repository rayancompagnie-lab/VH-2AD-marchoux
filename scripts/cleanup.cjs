// scripts/cleanup.js
// Script exécuté par GitHub Actions toutes les heures.
// Supprime les posts expirés des chemins : posts/culte, posts/travail, groupes/*

const admin = require('firebase-admin')

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
})

const db = admin.database()
const now = Date.now()

// Tous les chemins où les posts ont un champ expiresAt
const PATHS_TO_CLEAN = [
  'posts/culte',
  'posts/travail'
]

async function cleanPath(path) {
  const snap = await db.ref(path).once('value')
  const data = snap.val()
  if (!data) return 0

  const updates = {}
  let count = 0

  for (const [id, post] of Object.entries(data)) {
    if (post && typeof post.expiresAt === 'number' && post.expiresAt <= now) {
      updates[`${path}/${id}`] = null
      count++
    }
  }

  if (count > 0) {
    await db.ref().update(updates)
  }
  return count
}

async function cleanGroups() {
  // groupes/$groupPath/$postId
  const snap = await db.ref('groupes').once('value')
  const data = snap.val()
  if (!data) return 0

  const updates = {}
  let count = 0

  for (const [groupPath, posts] of Object.entries(data)) {
    if (!posts || typeof posts !== 'object') continue
    for (const [postId, post] of Object.entries(posts)) {
      if (post && typeof post.expiresAt === 'number' && post.expiresAt <= now) {
        updates[`groupes/${groupPath}/${postId}`] = null
        count++
      }
    }
  }

  if (count > 0) {
    await db.ref().update(updates)
  }
  return count
}

async function main() {
  console.log('🧹 Début du nettoyage...')
  let total = 0

  for (const path of PATHS_TO_CLEAN) {
    const n = await cleanPath(path)
    console.log(`   ${path}: ${n} supprimé(s)`)
    total += n
  }

  const groupCount = await cleanGroups()
  console.log(`   groupes/*: ${groupCount} supprimé(s)`)
  total += groupCount

  console.log(`✅ Total : ${total} post(s) expiré(s) supprimé(s)`)
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Erreur :', err)
  process.exit(1)
})