import { useEffect, useRef, useState } from 'react'
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
  const [error, setError] = useState('')
  const clientRef = useRef(null)
  const localTrackRef = useRef(null)

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'liveSessions/current'), (snap) => setLive(snap.val()))
    return unsubscribe
  }, [])

  useEffect(() => {
    return () => {
      // Nettoyage si le composant est démonté pendant une session active
      leave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function startBroadcast() {
    setError('')
    if (!APP_ID) {
      setError("Configuration Agora manquante (VITE_AGORA_APP_ID).")
      return
    }
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
      setError(err.message || 'Impossible de démarrer le direct.')
    }
  }

  async function stopBroadcast() {
    await leave()
    await remove(ref(db, 'liveSessions/current'))
  }

  async function listen() {
    setError('')
    if (!APP_ID) {
      setError("Configuration Agora manquante (VITE_AGORA_APP_ID).")
      return
    }
    try {
      const token = await fetchToken('audience')
      const client = getClient()
      await client.setClientRole('audience')
      client.on('user-published', async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType)
        if (mediaType === 'audio') {
          remoteUser.audioTrack.play()
        }
      })
      await client.join(APP_ID, CHANNEL, token, user.uid)
      setConnected(true)
    } catch (err) {
      setError(err.message || "Impossible de rejoindre le direct.")
    }
  }

  async function leave() {
    try {
      if (localTrackRef.current) {
        localTrackRef.current.stop()
        localTrackRef.current.close()
        localTrackRef.current = null
      }
      if (clientRef.current) {
        await clientRef.current.leave()
      }
      setConnected(false)
    } catch (err) {
      // déjà déconnecté
    }
  }

  return (
    <div className="live-audio">
      <h2>Direct</h2>
      {error && <p className="error">{error}</p>}

      {isAdmin && !live?.active && (
        <button onClick={startBroadcast}>🔴 Démarrer le direct</button>
      )}
      {isAdmin && live?.active && live.startedByUid === user?.uid && (
        <button onClick={stopBroadcast}>⏹️ Arrêter le direct</button>
      )}

      {live?.active ? (
        <div>
          <p>🔴 En direct — animé par {live.startedByName}</p>
          {!isAdmin && !connected && <button onClick={listen}>🎧 Écouter le direct</button>}
          {!isAdmin && connected && <button onClick={leave}>Quitter le direct</button>}
        </div>
      ) : (
        <p>Aucun direct en cours.</p>
      )}
    </div>
  )
}
