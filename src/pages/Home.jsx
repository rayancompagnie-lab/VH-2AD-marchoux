import { useEffect, useMemo, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { findTribu, findStatut } from '../utils/groups'
import ServiceDirectory from '../components/ServiceDirectory'
import PostFeed from '../components/PostFeed'
import PostComposer from '../components/PostComposer'
import LiveAudio from '../components/LiveAudio'
import AdminPanel from '../components/AdminPanel'
import Marketplace from '../components/Marketplace'
import Testimonies from '../components/Testimonies'
import PremiumBadge from '../components/PremiumBadge'
import GroupBoard from '../components/GroupBoard'
import MyProfile from './MyProfile'

const STATIC_TABS = ['Service', 'Actualités', 'Infos travail', 'Marché', 'Témoignages', 'Direct', 'Mon profil', 'Administration']

export default function Home() {
  const { profile, isSemiAdmin, isAdmin, isPremium, canManage, logout } = useAuth()
  const [tab, setTab] = useState('Service')
  const [allUsers, setAllUsers] = useState({})
  const [allBadges, setAllBadges] = useState({})

  useEffect(() => {
    const unsubUsers = onValue(ref(db, 'users'), (snap) => setAllUsers(snap.val() || {}))
    const unsubBadges = onValue(ref(db, 'badges'), (snap) => setAllBadges(snap.val() || {}))
    return () => {
      unsubUsers()
      unsubBadges()
    }
  }, [])

  // Un onglet de groupe n'apparaît que si au moins 2 membres partagent le même
  // critère (tribu, statut, ou badge donné par un admin).
  const myGroups = useMemo(() => {
    if (!profile) return []
    const users = Object.values(allUsers)
    const groups = []

    if (profile.tribu) {
      const count = users.filter((u) => u.tribu === profile.tribu).length
      if (count >= 2) {
        const t = findTribu(profile.tribu)
        groups.push({ path: `tribu-${profile.tribu}`, label: t ? t.label : profile.tribu })
      }
    }

    if (profile.statutRelationnel) {
      const count = users.filter((u) => u.statutRelationnel === profile.statutRelationnel).length
      if (count >= 2) {
        const s = findStatut(profile.statutRelationnel)
        groups.push({ path: `statut-${profile.statutRelationnel}`, label: s ? s.label : profile.statutRelationnel })
      }
    }

    Object.keys(profile.badges || {}).forEach((badgeId) => {
      const count = users.filter((u) => u.badges?.[badgeId]).length
      if (count >= 2) {
        groups.push({ path: `badge-${badgeId}`, label: allBadges[badgeId]?.name || 'Badge' })
      }
    })

    return groups
  }, [profile, allUsers, allBadges])

  const visibleTabs = [
    ...STATIC_TABS.filter((t) => t !== 'Administration' || isAdmin),
    ...myGroups.map((g) => g.label)
  ]

  const activeGroup = myGroups.find((g) => g.label === tab)

  return (
    <div className="home">
      <header className="topbar">
        <div className="brand">
          <img src="/logo.png" alt="Vase d'honneur" className="logo" />
          <h1>Vase d'honneur — 2AD Marchoux</h1>
        </div>
        <div className="user-chip">
          <button className="user-mini" onClick={() => setTab('Mon profil')} title="Voir mon profil">
            {profile?.photoPrincipale && <img src={profile.photoPrincipale} alt="" className="user-mini-avatar" />}
            <span>
              {profile?.prenom} {profile?.nom}
              {isAdmin && ' (Admin)'} {!isAdmin && isSemiAdmin && ' (Semi-admin)'}
              <PremiumBadge show={isPremium} />
            </span>
          </button>
          <button className="logout-btn" onClick={logout}>Déconnexion</button>
        </div>
      </header>

      <nav className="tabs">
        {visibleTabs.map((t) => (
          <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      <main className="tab-content">
        {tab === 'Service' && <ServiceDirectory />}

        {tab === 'Actualités' && (
          <div>
            {canManage('actualites') && (
              <PostComposer basePath="posts/culte" allowedTypes={['texte', 'vocal', 'image']} defaultDurationHours={24} />
            )}
            <PostFeed basePath="posts/culte" canDelete={canManage('actualites')} />
          </div>
        )}

        {tab === 'Infos travail' && (
          <div>
            {canManage('infosTravail') && (
              <PostComposer basePath="posts/travail" allowedTypes={['texte', 'image']} defaultDurationHours={168} />
            )}
            <PostFeed basePath="posts/travail" canDelete={canManage('infosTravail')} />
          </div>
        )}

        {tab === 'Marché' && <Marketplace />}

        {tab === 'Témoignages' && <Testimonies />}

        {tab === 'Direct' && <LiveAudio />}

        {tab === 'Mon profil' && <MyProfile />}

        {tab === 'Administration' && isAdmin && <AdminPanel />}

        {activeGroup && <GroupBoard groupPath={activeGroup.path} title={activeGroup.label} />}
      </main>
    </div>
  )
}
