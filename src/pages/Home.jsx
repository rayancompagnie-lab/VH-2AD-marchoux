import { useEffect, useMemo, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { TRIBUS, STATUTS, findTribu, findStatut } from '../utils/groups'
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

  // Calcule tous les groupes de l'application (tribus, statuts, badges)
  // qui ont au moins 2 membres.
  const allGroups = useMemo(() => {
    if (!profile) return []
    const users = Object.values(allUsers)
    const groups = []

    // Toutes les tribus qui ont au moins 2 membres
    TRIBUS.forEach((t) => {
      const count = users.filter((u) => u.tribu === t.key).length
      if (count >= 2) {
        groups.push({
          path: `tribu-${t.key}`,
          label: t.label,
          isMine: profile.tribu === t.key
        })
      }
    })

    // Tous les statuts qui ont au moins 2 membres
    STATUTS.forEach((s) => {
      const count = users.filter((u) => u.statutRelationnel === s.key).length
      if (count >= 2) {
        groups.push({
          path: `statut-${s.key}`,
          label: s.label,
          isMine: profile.statutRelationnel === s.key
        })
      }
    })

    // Tous les badges qui ont au moins 2 membres
    Object.keys(allBadges).forEach((badgeId) => {
      const count = users.filter((u) => u.badges?.[badgeId]).length
      if (count >= 2) {
        groups.push({
          path: `badge-${badgeId}`,
          label: allBadges[badgeId]?.name || 'Badge',
          isMine: !!profile.badges?.[badgeId]
        })
      }
    })

    return groups
  }, [profile, allUsers, allBadges])

  // Un admin voit TOUS les groupes, un membre ne voit que les siens.
  const visibleGroups = isAdmin ? allGroups : allGroups.filter((g) => g.isMine)

  const visibleTabs = [
    ...STATIC_TABS.filter((t) => t !== 'Administration' || isAdmin),
    ...visibleGroups.map((g) => g.label)
  ]

  const activeGroup = visibleGroups.find((g) => g.label === tab)

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