// scripts/migrate-avatars.cjs
// Script one-shot :
// 1. Assigne un avatarId par défaut aux users sans avatar
// 2. Supprime photoPrincipale / photoSecondaire des users
// 3. Supprime les anciens posts avec images/vocaux (posts, groupes, marche, temoignages)

const admin = require('firebase-admin')

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
})

const db = admin.database()

const DEFAULT_HOMME = 'h-lion'
const DEFAULT_FEMME = 'f-fleur'

// ─── 1. Migration des users ───
async function migrateUsers() {
  console.log('\n👤 Migration des utilisateurs...')
  const snap = await db.ref('users').once('value')
  const users = snap.val() || {}

  const updates = {}
  let migrated = 0

  for (const [uid, u] of Object.entries(users)) {
    let changed = false

    if (!u.avatarId) {
      const fallback = u.sexe === 'femme' ? DEFAULT_FEMME : DEFAULT_HOMME
      updates[`users/${uid}/avatarId`] = fallback
      changed = true
    }

    if (u.photoPrincipale !== undefined) {
      updates[`users/${uid}/photoPrincipale`] = null
      changed = true
    }
    if (u.photoSecondaire !== undefined) {
      updates[`users/${uid}/photoSecondaire`] = null
      changed = true
    }

    if (changed) migrated++
  }

  if (migrated > 0) {
    await db.ref().update(updates)
  }
  console.log(`   ✅ ${migrated} utilisateur(s) migré(s)`)
}

// ─── 2. Nettoyage des posts avec images/vocaux ───
async function cleanPosts(basePath) {
  const snap = await db.ref(basePath).once('value')
  const data = snap.val() || {}

  const updates = {}
  let count = 0

  for (const [id, post] of Object.entries(data)) {
    // Supprime les posts de type 'vocal' ou 'image' (anciens formats)
    if (post && (post.type === 'vocal' || post.type === 'image')) {
      updates[`${basePath}/${id}`] = null
      count++
    }
  }

  if (count > 0) {
    await db.ref().update(updates)
  }
  console.log(`   🧹 ${basePath} : ${count} ancien(s) post(s) supprimé(s)`)
}

async function cleanGroupes() {
  console.log('\n💬 Nettoyage des groupes...')
  const snap = await db.ref('groupes').once('value')
  const data = snap.val() || {}

  const updates = {}
  let count = 0

  for (const [groupPath, posts] of Object.entries(data)) {
    if (!posts || typeof posts !== 'object') continue
    for (const [postId, post] of Object.entries(posts)) {
      if (post && post.authorPhoto !== undefined) {
        // Retire juste le champ authorPhoto (garde le post)
        updates[`groupes/${groupPath}/${postId}/authorPhoto`] = null
        count++
      }
    }
  }

  if (count > 0) {
    await db.ref().update(updates)
  }
  console.log(`   ✅ ${count} champ(s) authorPhoto supprimé(s)`)
}

async function cleanMarche() {
  console.log('\n🛒 Nettoyage du Marché...')
  // On ne supprime PAS les articles, mais on retire les champs authorPremium inutiles ?
  // Pour l'instant rien à faire. Les images du Marché sont conservées.
  console.log('   ✅ Rien à nettoyer (les images du Marché sont conservées)')
}

async function cleanTemoignages() {
  console.log('\n🙏 Nettoyage des témoignages...')
  const snap = await db.ref('temoignages').once('value')
  const data = snap.val() || {}

  const updates = {}
  let count = 0

  for (const [id, t] of Object.entries(data)) {
    if (t && t.type === 'pdf') {
      // Supprime les témoignages PDF (on ne garde que les textes)
      updates[`temoignages/${id}`] = null
      count++
    }
  }

  if (count > 0) {
    await db.ref().update(updates)
  }
  console.log(`   🧹 ${count} témoignage(s) PDF supprimé(s)`)
}

// ─── 3. Script principal ───
async function main() {
  console.log('🚀 Début de la migration + nettoyage...')

  await migrateUsers()

  console.log('\n📝 Nettoyage des posts...')
  await cleanPosts('posts/culte')
  await cleanPosts('posts/travail')

  await cleanGroupes()
  await cleanMarche()
  await cleanTemoignages()

  console.log('\n✅ Terminé avec succès.')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ Erreur :', err)
  process.exit(1)
})