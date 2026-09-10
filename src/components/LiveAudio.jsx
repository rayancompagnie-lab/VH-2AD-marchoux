import { useCallback, useEffect, useRef, useState } from 'react'
import AgoraRTC from 'agora-rtc-sdk-ng'
import { onValue, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

const APP_ID = import.meta.env.VITE_AGORA_APP_ID
const CHANNEL = 'vase-honneur-culte'

// Badges qui donnent le droit de parler dans le direct (en plus des admins/semi-admins)
const LIVE_SPEAKER_BADGES = ['GA', 'Patriarche', 'AP', 'Assistant Pasteur', 'Gagneur d\'âmes']

// Vérifie si un nom de badge correspond à la liste autorisée
function isLiveSpeakerBadge(badgeName) {
  if (!badgeName) return false
  const normalized = badgeName.trim().toLowerCase()
  return LIVE_SPEAKER_BADGES.some((authorized) =>
    normalized.includes(authorized.toLowerCase())
  )
}

export default function LiveAudio() {
  const { user, profile, isAdmin, isSemiAdmin } = useAuth()
  const [live, setLive] = useState(null)
  const [allBadges, setAllBadges] = useState({})
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const clientRef = useRef(null)
  const localTrackRef = useRef(null)
  const busyRef = useRef(false)

  // Charge tous les badges (pour identifier les badges spéciaux par leur nom)
  useEffect(() => {
    const unsub = onValue(ref(db, 'badges'), (snap) => setAllBadges(snap.val() || {}))
    return unsub
  }, [])

  // Écoute la session live
  useEffect(() => {
    const unsub = onValue(ref(db, 'liveSessions/current'), (snap) => setLive(snap.val()))
    return unsub
  }, [])

  // Vérifie si l'utilisateur porte un badge "parleur" (GA, Patriarche, AP...)
  const hasSpeakerBadge = (() => {
    if (!profile?.badges) return false
    return Object.keys(profile.badges).some((badgeId) => {
      const badge = allBadges[badgeId]
      return badge && isLiveSpeakerBadge(badge.name)
    })
  })()

  // Un "semi-admin live" = admin OU semi-admin OU porteur d'un badge spécial
  const isLiveHost = isAdmin || isSemiAdmin || hasSpeakerBadge

  // Détermine le titre à afficher
  const liveTitle = (() => {
    if (isAdmin) return 'Admin'
    if (isSemiAdmin) return 'Semi-admin Live'
    if (hasSpeakerBadge) {
      // Trouve le nom du badge pour l'afficher
      if (!profile?.badges) return 'Semi-admin Live'
      for (const badgeId of Object.keys(profile.badges)) {
        const badge = allBadges[badgeId]
        if (badge && isLiveSpeakerBadge(badge.name)) {
          return `Semi-admin Live (${badge.name})`
        }
      }
      return 'Semi-admin Live'
    }
    return null
  })()

  function getClient() {
    if (!clientRef.current) {
      clientRef.current = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' })
    }
    return clientRef.current
  }

  async function fetchToken(role) {
    const res = await fetch(
      `/api/agora-token?channel=${encodeURIComponent(CHANNEL)}&uid=${encodeURIComponent(user.uid)}&role=${role}`
    )
    let data = null
    try {
      data = await res.json()
    } catch (e) {}
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Impossible d'obtenir un token (code ${res.status}).`)
    }
    return data.token
  }

  const removeListenerEntry = useCallback(async () => {
    if (!user?.uid) return
    try {
      await remove(ref(db, `liveSessions/current/listeners/${user.uid}`))
    } catch (e) {}
  }, [user])

  const leave = useCallback(async () => {
    try {
      if (localTrackRef.current) {
        localTrackRef.current.stop()
        localTrackRef.current.close()
        localTrackRef.current = null
      }
      if (clientRef.current) {
        await clientRef.current.leave()
      }
    } catch (err) {}
    setConnected(false)
    setConnecting(false)
    busyRef.current = false
    await removeListenerEntry()
  }, [removeListenerEntry])

  useEffect(() => {
    return () => {
      leave()
    }
  }, [leave])

  // ====== Lancer un direct (admin ou semi-admin live) ======
  async function startBroadcast() {
    if (busyRef.current || connected || connecting) return
    setError('')

    if (!APP_ID) {
      setError('Configuration Agora manquante (VITE_AGORA_APP_ID).')
      return
    }
    if (live?.active) {
      setError("Un direct est déjà en cours. Tu peux le rejoindre en tant qu'invité.")
      return
    }
    if (!isLiveHost) {
      setError("Tu n'as pas la permission de lancer un direct.")
      return
    }

    busyRef.current = true
    setConnecting(true)
    try {
      const token = await fetchToken('host')
      const client = getClient()
      await client.setClientRole('host')
      await client.join(APP_ID, CHANNEL, token, user.uid)

      localTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack()
      await client.publish([localTrackRef.current])

      await set(ref(db, 'liveSessions/current'), {
        active: true,
        startedByUid: user.uid,
        startedByName: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        startedByTitle: liveTitle || 'Admin',
        startedAt: Date.now()
      })
      setConnected(true)
    } catch (err) {
      console.error('Erreur démarrage direct :', err)
      setError(err.message || 'Impossible de démarrer le direct.')
      await leave()
    } finally {
      setConnecting(false)
      busyRef.current = false
    }
  }

  // ====== Rejoindre un direct en tant que "co-animateur" (parler) ======
  async function joinAsSpeaker() {
    if (busyRef.current || connected || connecting) return
    setError('')

    if (!APP_ID) {
      setError('Configuration Agora manquante (VITE_AGORA_APP_ID).')
      return
    }
    if (!isLiveHost) {
      setError("Tu n'as pas la permission de parler dans le direct.")
      return
    }

    busyRef.current = true
    setConnecting(true)
    try {
      const token = await fetchToken('host')
      const client = getClient()
      await client.setClientRole('host')
      await client.join(APP_ID, CHANNEL, token, user.uid)

      localTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack()
      await client.publish([localTrackRef.current])

      // S'enregistrer dans la liste des intervenants
      await set(ref(db, `liveSessions/current/speakers/${user.uid}`), {
        uid: user.uid,
        name: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        title: liveTitle || 'Semi-admin Live',
        photo: profile?.photoPrincipale || '',
        joinedAt: Date.now()
      })

      setConnected(true)
    } catch (err) {
      console.error('Erreur rejoindre en tant qu\'intervenant :', err)
      setError(err.message || 'Impossible de rejoindre le direct.')
      await leave()
    } finally {
      setConnecting(false)
      busyRef.current = false
    }
  }

  // ====== Arrêter un direct (uniquement celui qui l'a lancé) ======
  async function stopBroadcast() {
    if (busyRef.current) return
    busyRef.current = true
    try {
      // Si je suis le créateur du direct → je supprime tout
      if (live?.startedByUid === user.uid) {
        await leave()
        await remove(ref(db, 'liveSessions/current'))
      } else {
        // Sinon je quitte juste ma place d'intervenant
        if (user?.uid) {
          await remove(ref(db, `liveSessions/current/speakers/${user.uid}`))
        }
        await leave()
      }
    } finally {
      busyRef.current = false
    }
  }

  // ====== Écouter en auditeur ======
  async function listen() {
    if (busyRef.current || connected || connecting) return
    setError('')

    if (!APP_ID) {
      setError('Configuration Agora manquante (VITE_AGORA_APP_ID).')
      return
    }

    busyRef.current = true
    setConnecting(true)
    try {
      const token = await fetchToken('audience')
      const client = getClient()
      await client.setClientRole('audience')

      client.removeAllListeners('user-published')
      client.removeAllListeners('user-unpublished')

      client.on('user-published', async (remoteUser, mediaType) => {
        try {
          await client.subscribe(remoteUser, mediaType)
          if (mediaType === 'audio') {
            remoteUser.audioTrack.play()
          }
        } catch (e) {
          console.error('Erreur subscription :', e)
        }
      })

      await client.join(APP_ID, CHANNEL, token, user.uid)
      setConnected(true)

      await set(ref(db, `liveSessions/current/listeners/${user.uid}`), {
        uid: user.uid,
        name: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim() || 'Membre',
        photo: profile?.photoPrincipale || '',
        joinedAt: Date.now()
      })
    } catch (err) {
      console.error('Erreur écoute direct :', err)
      setError(err.message || 'Impossible de rejoindre le direct.')
      await leave()
    } finally {
      setConnecting(false)
      busyRef.current = false
    }
  }

  const isBroadcaster = live?.active && live.startedByUid === user?.uid
  const isOtherBroadcast = live?.active && live.startedByUid !== user?.uid

  // Auditeurs (hors diffuseur et hors intervenants)
  const speakers = live?.speakers ? Object.values(live.speakers) : []
  const speakerUids = speakers.map((s) => s.uid)

  const listeners = live?.listeners
    ? Object.values(live.listeners)
        .filter((l) => l.uid !== live.startedByUid && !speakerUids.includes(l.uid))
        .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
    : []

  // Suis-je déjà intervenant (co-animateur) ?
  const iAmSpeaker = speakerUids.includes(user?.uid)

  return (
    <div className="live-audio">
      <h2>Direct</h2>
      {error && <p className="error">{error}</p>}

      {/* Bandeau d'information si l'utilisateur a un titre spécial */}
      {isLiveHost && liveTitle && (
        <p className="muted-small" style={{ marginBottom: 8 }}>
          🎙️ Ton rôle dans le direct : <strong>{liveTitle}</strong>
        </p>
      )}

      {/* ===== CAS 1 : Aucun direct en cours ===== */}
      {!live?.active && (
        <>
          {isLiveHost ? (
            <button onClick={startBroadcast} disabled={connecting}>
              {connecting ? 'Connexion...' : '🔴 Démarrer le direct'}
            </button>
          ) : (
            <p>Aucun direct en cours.</p>
          )}
        </>
      )}

      {/* ===== CAS 2 : Direct en cours ===== */}
      {live?.active && (
        <div>
          <p>
            🔴 En direct — animé par <strong>{live.startedByName}</strong>
            {live.startedByTitle && <em> ({live.startedByTitle})</em>}
          </p>

          {/* Le créateur peut arrêter tout le direct */}
          {isBroadcaster && (
            <button onClick={stopBroadcast} disabled={connecting}>
              ⏹️ Arrêter le direct
            </button>
          )}

          {/* Un semi-admin live qui n'est PAS le créateur : peut rejoindre pour parler */}
          {isOtherBroadcast && isLiveHost && !iAmSpeaker && !connected && (
            <button onClick={joinAsSpeaker} disabled={connecting}>
              {connecting ? 'Connexion...' : '🎙️ Rejoindre pour parler'}
            </button>
          )}

          {/* Un semi-admin live qui est déjà intervenant : bouton quitter */}
          {isOtherBroadcast && iAmSpeaker && (
            <button onClick={stopBroadcast}>🚪 Quitter le direct</button>
          )}

          {/* Un auditeur simple (ni admin, ni semi-admin, ni badge spécial) */}
          {isOtherBroadcast && !isLiveHost && !connected && (
            <button onClick={listen} disabled={connecting}>
              {connecting ? 'Connexion...' : '🎧 Écouter le direct'}
            </button>
          )}
          {isOtherBroadcast && !isLiveHost && connected && (
            <button onClick={leave}>Quitter le direct</button>
          )}

          {/* ===== LISTE DES INTERVENANTS ===== */}
          {speakers.length > 0 && (
            <div style={{ marginTop: 24, textAlign: 'left' }}>
              <h3 style={{ fontSize: 15, color: 'var(--color-teal-dark)' }}>
                🎙️ Intervenants ({speakers.length})
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {speakers.map((s) => (
                  <li
                    key={s.uid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: '1px solid #eee7d5'
                    }}
                  >
                    {s.photo ? (
                      <img
                        src={s.photo}
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'var(--color-crimson)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: 14
                        }}
                      >
                        {(s.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: 14 }}>
                      {s.name}
                      <em style={{ color: 'var(--color-crimson)', fontSize: 12 }}> ({s.title})</em>
                      {s.uid === user?.uid && (
                        <em style={{ color: 'var(--color-text-muted)', fontSize: 12 }}> (toi)</em>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ===== LISTE DES AUDITEURS ===== */}
          <div style={{ marginTop: 24, textAlign: 'left' }}>
            <h3 style={{ fontSize: 15, color: 'var(--color-teal-dark)' }}>
              🎧 Auditeurs en direct ({listeners.length})
            </h3>
            {listeners.length === 0 ? (
              <p className="muted-small">Personne n'écoute pour le moment.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {listeners.map((l) => (
                  <li
                    key={l.uid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: '1px solid #eee7d5'
                    }}
                  >
                    {l.photo ? (
                      <img
                        src={l.photo}
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'var(--color-teal)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: 14
                        }}
                      >
                        {(l.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: 14 }}>
                      {l.name}
                      {l.uid === user?.uid && (
                        <em style={{ color: 'var(--color-text-muted)', fontSize: 12 }}> (toi)</em>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}