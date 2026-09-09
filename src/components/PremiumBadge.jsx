import { PREMIUM_WHATSAPP, toWhatsappLink } from '../utils/whatsapp'

// show: le compte est déjà Premium -> pastille dorée informative
// canRequest + name: le compte ne l'est pas encore et c'est le sien -> pastille
// bleue cliquable qui ouvre WhatsApp pour en faire la demande
export default function PremiumBadge({ show, canRequest, name }) {
  if (show) return <span className="premium-badge">⭐ Premium</span>
  if (canRequest) {
    return (
      <a
        className="premium-request-badge"
        href={toWhatsappLink(
          PREMIUM_WHATSAPP,
          `Bonjour, je souhaite passer au mode Premium sur Vase d'honneur (compte : ${name || ''}).`
        )}
        target="_blank"
        rel="noreferrer"
        title="Devenir Premium"
      >
        ● Devenir Premium
      </a>
    )
  }
  return null
}
