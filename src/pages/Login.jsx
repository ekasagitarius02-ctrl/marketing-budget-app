import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim())
        .eq('is_active', true)
        .single()

      if (dbError || !data) {
        setError('Username atau password salah')
        setLoading(false)
        return
      }

      // Sementara password masih plain text (nanti dienkripsi)
      if (data.password_hash !== password) {
        setError('Username atau password salah')
        setLoading(false)
        return
      }

      onLogin({
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        role: data.role,
        brand_access: data.brand_access || [],
        approver_level: data.approver_level
      })
    } catch (err) {
      setError('Terjadi kesalahan. Coba lagi.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Marketing Budget System</h1>
        <p style={styles.subtitle}>Silakan login untuk melanjutkan</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Masukkan username"
              required
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Masukkan password"
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>

        <p style={styles.hint}>
          Default: username <b>admin</b> / password <b>admin123</b>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1F4E79 0%, #2E86AB 100%)',
    padding: '1rem'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
  },
  title: {
    fontSize: '1.5rem',
    color: '#1F4E79',
    textAlign: 'center',
    marginBottom: '0.5rem'
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: '2rem',
    fontSize: '0.95rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#374151'
  },
  input: {
    padding: '0.75rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none'
  },
  button: {
    marginTop: '0.5rem',
    padding: '0.85rem',
    background: '#1F4E79',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    textAlign: 'center'
  },
  hint: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#9ca3af'
  }
}
