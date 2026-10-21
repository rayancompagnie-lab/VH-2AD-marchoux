// api/agora-token.js
import pkg from 'agora-access-token'
const { RtcTokenBuilder, RtcRole } = pkg

export default function handler(req, res) {
  const appId = process.env.VITE_AGORA_APP_ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE
  const channelName = 'vase-honneur-live'
  
  if (!appId || !appCertificate) {
    return res.status(500).json({ error: "Configuration Agora manquante." })
  }

  const uid = 0 // UID unique
  const role = RtcRole.PUBLISHER // On met PUBLISHER pour tout le monde pour éviter les bugs de token
  const expirationTimeInSeconds = 3600
  const currentTimestamp = Math.floor(Date.now() / 1000)
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId, appCertificate, channelName, uid, role, privilegeExpiredTs
  )

  res.status(200).json({ token, uid, appId, channel: channelName })
}