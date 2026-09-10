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
  // Empêche les doubles appels (React StrictMode, re-render, double-clic, etc.)
  const busyRef = useRef(false)

  // Écoute les changements de la session live dans Firebase
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
    } catch (e) {
      // réponse non-JSON (ex: page d'erreur Vercel)
    }
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Impossible d'obtenir un token (code ${res.status}).`)
    }
    return data.token
  }

  // Quitte proprement le canal (utilisé au démontage et par les boutons)
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
    } catch (err) {
      // déjà déconnecté, on ignore
    }
    setConnected(false)
    setConnecting(false)
    busyRef.current = false
  }, [])

  // Nettoyage au démontage du composant
  useEffect(() => {
    return () => {
      leave()
    }
  }, [leave])

  // ====== ADMIN : Démarrer le direct ======
  async function startBroadcast() {
    if (busyRef.current || connected || connecting) return
    setError('')

    if (!APP_ID) {
      setError('Configuration Agora manquante (VITE_AGORA_APP_ID).')
      return
    }
    if (live?.active) {
      setError('Un direct est déjà en cours. Arrête-le avant d\'en lancer un nouveau.')
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
      // Si on a réussi à join mais pas à publier, on quitte pour ne pas rester coincé
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

  // ====== TOUT LE MONDE : Écouter le direct ======
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

      // Retire d'éventuels anciens listeners avant d'en ajouter un nouveau
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
  const isOtherBroadcast = live?.active && live.startedByUid !== user?.uid

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

          {/* L'admin qui diffuse peut arrêter */}
          {isAdmin && isBroadcaster && (
            <button onClick={stopBroadcast} disabled={connecting}>
              ⏹️ Arrêter le direct
            </button>
          )}

          {/* Tout le monde (admin ou membre) SAUF le diffuseur peut écouter */}
          {isOtherBroadcast && !connected && (
            <button onClick={listen} disabled={connecting}>
              {connecting ? 'Connexion...' : '🎧 Écouter le direct'}
            </button>
          )}
          {isOtherBroadcast && connected && (
            <button onClick={leave}>Quitter le direct</button>
          )}

          {/* Info pour l'admin qui écoute (petit message explicatif) */}
          {isAdmin && isOtherBroadcast && connected && (
            <p className="muted-small">
              Tu écoutes en tant qu'auditeur (ce n'est pas toi qui diffuses).
            </p>
          )}
        </div>
      )}
    </div>
  )
}