// scripts/migrate-avatars.cjs
// Script one-shot : assigne un avatarId par défaut aux users sans avatar,
// et supprime photoPrincipale / photoSecondaire.

const admin = require('firebase-admin')

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
})

const db = admin.database()

// Avatar par défaut selon le sexe (premier de chaque liste)
const DEFAULT_HOMME = 'h-lion'
const DEFAULT_FEMME = 'f-fleur'

async function migrate() {
  console.log('🔍 Lecture des utilisateurs...')
  const snap = await db.ref('users').once('value')
  const users = snap.val() || {}

  const updates = {}
  let migrated = 0

  for (const [uid, u] of Object.entries(users)) {
    let changed = false

    // 1. Avatar par défaut si absent
    if (!u.avatarId) {
      const fallback = u.sexe === 'femme' ? DEFAULT_FEMME : DEFAULT_HOMME
      updates[`users/${uid}/avatarId`] = fallback
      changed = true
    }

    // 2. Supprimer les photos base64
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

  if (migrated === 0) {
    console.log('✅ Rien à migrer.')
    process.exit(0)
  }

  console.log(`📝 Migration de ${migrated} utilisateur(s)...`)
  await db.ref().update(updates)
  console.log(`✅ Terminé : ${migrated} utilisateur(s) migré(s)`)
  process.exit(0)
}

migrate().catch((err) => {
  console.error('❌ Erreur :', err)
  process.exit(1)
})