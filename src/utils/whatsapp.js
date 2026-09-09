export const PREMIUM_WHATSAPP = '2250160672966' // +225 01 60 67 29 66

export function toWhatsappLink(contact, message) {
 const digits = String(contact || '').replace(/[^\d]/g, '')
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${text}`
}
