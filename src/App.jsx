import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Programs from './pages/Programs'
import Approval from './pages/Approval'
import Budgeting from './pages/Budgeting'
import Layout from './components/Layout'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('mb_user')
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch (e) {
        localStorage.removeItem('mb_user')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('mb_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('mb_user')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Memuat...
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />}
      />
      <Route
        path="/"
        element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
      >
        <Route index element={<Dashboard user={user} />} />
        <Route
          path="users"
          element={
            user?.role === 'administrator'
              ? <Users user={user} />
              : <Navigate to="/" />
          }
        />
        <Route
          path="programs"
          element={
            (user?.role === 'administrator' || user?.role === 'admin_brand' || user?.role === 'approver')
              ? <Programs user={user} />
              : <Navigate to="/" />
          }
        />
        <Route
          path="approval"
          element={
            user?.role === 'approver'
              ? <Approval user={user} />
              : <Navigate to="/" />
          }
        />
        <Route
          path="budgeting"
          element={
            (user?.role === 'administrator' || user?.role === 'admin_brand')
              ? <Budgeting user={user} />
              : <Navigate to="/" />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
