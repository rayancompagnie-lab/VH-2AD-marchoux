import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PasswordField from '../components/PasswordField'

export default function Login() {
  const { loginWithEmail, loginWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await loginWithEmail(email, password)
      navigate('/')
    } catch (err) {
      setError("Email ou mot de passe incorrect.")
    }
  }

  async function handleGoogle() {
    setError('')
    try {
      await loginWithGoogle()
      navigate('/')
    } catch (err) {
      setError('Connexion Google impossible.')
    }
  }

  return (
    <div className="auth-page">
      <h1>Vase d'honneur — 2AD Marchoux</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Connexion</h2>
        {error && <p className="error">{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Se connecter</button>
        <button type="button" className="google-btn" onClick={handleGoogle}>Continuer avec Google</button>
        <p>Pas encore de compte ? <Link to="/inscription">S'inscrire</Link></p>
      </form>
    </div>
  )
}
