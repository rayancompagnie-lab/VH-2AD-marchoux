// Fichier en .cjs (CommonJS) volontairement : le reste du projet est en "type": "module"
// (Vite), mais les fonctions serverless Vercel sont plus fiables en CommonJS classique
// avec des packages comme agora-access-token qui ne sont pas pensés pour l'ESM.

module.exports = (req, res) => {
  try {
    const { RtcTokenBuilder, RtcRole } = require('agora-access-token')

    const { channel, uid, role } = req.query || {}

    const appId = process.env.VITE_AGORA_APP_ID
    const appCertificate = process.env.AGORA_APP_CERTIFICATE

    if (!appId || !appCertificate) {
      res.status(500).json({
        error: 'Configuration Agora manquante côté serveur.',
        details: {
          appIdPresent: !!appId,
          appCertificatePresent: !!appCertificate
        }
      })
      return
    }

    if (!channel || !uid) {
      res.status(400).json({ error: 'Paramètres "channel" et "uid" requis.' })
      return
    }

    const agoraRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER
    const expirationTimeInSeconds = 3600
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    const token = RtcTokenBuilder.buildTokenWithAccount(
      appId,
      appCertificate,
      channel,
      String(uid),
      agoraRole,
      privilegeExpiredTs
    )

    res.status(200).json({ token })
  } catch (err) {
    // On renvoie le détail de l'erreur au lieu de laisser la fonction planter
    // silencieusement (FUNCTION_INVOCATION_FAILED sans explication).
    res.status(500).json({ error: 'Erreur interne lors de la génération du token.', message: err.message })
  }
}
