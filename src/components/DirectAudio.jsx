import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ref, onValue, set, remove } from 'firebase/database'
import { db } from '../firebase'

export default function DirectAudio() {
  const { user, isAdmin, profile } = useAuth()
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  
  const clientRef = useRef(null)

  // 1. Écouter si un direct est en cours (dans Firebase)
  useEffect(() => {
    const unsub = onValue(ref(db, 'live/direct'), (snap) => {
      const data = snap.val()
      setIsLive(!!data?.active)
      setLoading(false)
    })
    return unsub
  }, [])

  // 2. Charger le SDK Agora dynamiquement
  useEffect(() => {
    if (window.AgoraRTC) return
    const script = document.createElement('script')
    script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  // 3. Fonction pour rejoindre le direct (Auditeur ou Hôte)
  async function joinChannel(asHost = false) {
    if (!window.AgoraRTC) {
      setError("SDK Agora en cours de chargement, réessaie dans 2 secondes.")
      return
    }
    setError('')
    
    try {
      // Récupérer le token depuis notre API Vercel
      const res = await fetch(`/api/agora-token?role=${asHost ? 'host' : 'audience'}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const client = window.AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
      clientRef.current = client

      // Événements Agora
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType)
        if (mediaType === 'audio') {
          user.audioTrack.play()
        }
      })

      // Rejoindre le canal
      await client.join(data.appId, data.channel, data.token, data.uid)

      // Si c'est l'hôte, on active le micro
      if (asHost) {
        const localAudioTrack = await window.AgoraRTC.createMicrophoneAudioTrack()
        await client.publish([localAudioTrack])
        await set(ref(db, 'live/direct'), {
          active: true,
          hostName: `${profile.prenom} ${profile.nom}`,
          startedAt: Date.now()
        })
      }
      
      setJoined(true)
    } catch (err) {
      console.error(err)
      setError("Impossible de rejoindre le direct : " + err.message)
    }
  }

  // 4. Quitter le direct
  async function leaveChannel() {
    if (clientRef.current) {
      await clientRef.current.leave()
      clientRef.current = null
    }
    if (isAdmin) {
      await remove(ref(db, 'live/direct'))
    }
    setJoined(false)
  }

  // 5. Couper / Activer le micro (Hôte)
  async function toggleMute() {
    if (!clientRef.current) return
    const localTracks = clientRef.current.localTracks
    if (localTracks && localTracks.length > 0) {
      if (isMuted) {
        await localTracks[0].setMuted(false)
      } else {
        await localTracks[0].setMuted(true)
      }
      setIsMuted(!isMuted)
    }
  }

  if (loading) return <p>Chargement...</p>

  return (
    <div className="direct-audio" style={{ textAlign: 'center', padding: 20 }}>
      <h2>🎙️ Direct Audio</h2>
      {error && <p className="error">{error}</p>}

      {/* VUE : Personne n'est en direct */}
      {!isLive && !joined && (
        <div>
          <p className="muted-small">Aucun direct en cours pour le moment.</p>
          {isAdmin && (
            <button onClick={() => joinChannel(true)} style={{ background: 'var(--color-crimson)', color: 'white', padding: '10px 20px', borderRadius: 8, border: 'none', marginTop: 12 }}>
              🔴 Démarrer un direct
            </button>
          )}
        </div>
      )}

      {/* VUE : Un direct est en cours (Auditeur) */}
      {isLive && !joined && (
        <div>
          <p style={{ color: 'var(--color-crimson)', fontWeight: 'bold' }}>🔴 En direct maintenant !</p>
          <button onClick={() => joinChannel(false)} style={{ background: 'var(--color-teal)', color: 'white', padding: '10px 20px', borderRadius: 8, border: 'none', marginTop: 12 }}>
            🎧 Écouter le direct
          </button>
        </div>
      )}

      {/* VUE : Connecté au direct */}
      {joined && (
        <div>
          <p style={{ color: 'var(--color-green)', fontWeight: 'bold' }}>✅ Connecté au direct</p>
          {isAdmin && (
             <button onClick={toggleMute} style={{ marginRight: 10 }}>
               {isMuted ? '🎙️ Activer le micro' : '🔇 Couper le micro'}
             </button>
          )}
          <button onClick={leaveChannel} style={{ background: 'var(--color-crimson)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8 }}>
            Quitter
          </button>
        </div>
      )}
    </div>
  )
}