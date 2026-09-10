import { useCallback, useEffect, useRef, useState } from 'react'
import AgoraRTC from 'agora-rtc-sdk-ng'
import { onValue, ref, remove, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

const APP_ID = import.meta.env.VITE_AGORA_APP_ID
const CHANNEL = 'vase-honneur-culte'

export default function LiveAudio() {
  const { user, profile, isAdmin } = useAuth()
  const [live, setLive] = useState(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const clientRef = useRef(null)
  const localTrackRef = useRef(null)
  const busyRef = useRef(false)

  // Écoute la session live
  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'liveSessions/current'), (snap) => {
      setLive(snap.val())
    })
    return unsubscribe
  }, [])

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

  // ====== ADMIN : Démarrer le direct (SEUL INTERVENANT) ======
  async function startBroadcast() {
    if (busyRef.current || connected || connecting) return
    setError('')

    if (!APP_ID) {
      setError('Configuration Agora manquante (VITE_AGORA_APP_ID).')
      return
    }
    if (!isAdmin) {
      setError("Seul un administrateur peut lancer un direct.")
      return
    }
    if (live?.active) {
      setError("Un direct est déjà en cours.")
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

  // ====== ADMIN : Arrêter le direct ======
  async function stopBroadcast() {
    if (busyRef.current) return
    busyRef.current = true
    try {
      await leave()
      await remove(ref(db, 'liveSessions/current'))
    } finally {
      busyRef.current = false
    }
  }

  // ====== TOUT LE MONDE (sauf l'animateur) : Écouter ======
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

      // S'enregistrer dans la liste des auditeurs
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

  // Est-ce moi qui anime ce direct ?
  const isBroadcaster = live?.active && live.startedByUid === user?.uid
  const isAudience = live?.active && live.startedByUid !== user?.uid

  // Liste des auditeurs
  const listeners = live?.listeners
    ? Object.values(live.listeners)
        .filter((l) => l.uid !== live.startedByUid)
        .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
    : []

  return (
    <div className="live-audio">
      <h2>Direct</h2>
      {error && <p className="error">{error}</p>}

      {/* ===== CAS 1 : Aucun direct en cours ===== */}
      {!live?.active && (
        <>
          {isAdmin ? (
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
          <p>🔴 En direct — animé par {live.startedByName}</p>

          {/* L'animateur : peut arrêter */}
          {isBroadcaster && (
            <button onClick={stopBroadcast} disabled={connecting}>
              ⏹️ Arrêter le direct
            </button>
          )}

          {/* Tous les autres : peuvent écouter */}
          {isAudience && !connected && (
            <button onClick={listen} disabled={connecting}>
              {connecting ? 'Connexion...' : '🎧 Écouter le direct'}
            </button>
          )}
          {isAudience && connected && (
            <button onClick={leave}>Quitter le direct</button>
          )}

          {/* Liste des auditeurs */}
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