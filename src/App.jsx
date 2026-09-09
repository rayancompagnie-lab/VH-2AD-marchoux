import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import CompleteProfile from './pages/CompleteProfile'
import Home from './pages/Home'

function PrivateRoute({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="loading">Chargement...</div>
  if (!user) return <Navigate to="/connexion" replace />
  if (profile && profile.profileComplete === false) {
    return <Navigate to="/completer-profil" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Login />} />
      <Route path="/inscription" element={<Register />} />
      <Route path="/completer-profil" element={<CompleteProfile />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}
