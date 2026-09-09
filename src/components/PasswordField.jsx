import { useState } from 'react'

export default function PasswordField({ value, onChange, placeholder = 'Mot de passe', ...rest }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="password-field">
      <input
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...rest}
      />
      <button
        type="button"
        className="toggle-password"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  )
}
