// Redimensionne et compresse une image avant de la stocker en base64.
// Paramètres plus agressifs que l'original : 800px max, qualité 0.7.
// Objectif : ~80-150 Ko par image au lieu de 500+ Ko.
export function fileToResizedBase64(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Vérifie qu'une image base64 ne dépasse pas une taille max (en Ko).
// Utile pour refuser les images trop lourdes avant l'envoi.
export function isImageTooLarge(base64, maxKo = 200) {
  // base64 : ~4/3 de la taille binaire réelle
  const sizeKo = (base64.length * 3) / 4 / 1024
  return sizeKo > maxKo
}