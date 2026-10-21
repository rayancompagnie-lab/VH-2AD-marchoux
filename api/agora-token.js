// api/agora-token.js
import { RtcTokenBuilder, RtcRole } from 'agora-access-token'

export default function handler(req, res) {
  const appId = process.env.VITE_AGORA_APP_ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE
  const channelName = req.query.channel || 'vase-honneur-live'
  
  if (!appId || !appCertificate) {
    return res.status(500).json({ error: "Configuration Agora manquante." })
  }

  const uid = Math.floor(Math.random() * 10000)
  const role = req.query.role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER
  const expirationTimeInSeconds = 3600
  const currentTimestamp = Math.floor(Date.now() / 1000)
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId, appCertificate, channelName, uid, role, privilegeExpiredTs
  )

  res.status(200).json({ token, uid, appId, channel: channelName })
}