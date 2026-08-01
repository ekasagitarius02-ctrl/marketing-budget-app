import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Users({ user }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'admin_brand',
    brand_access: 'Herbacare',
    approver_level: 1
  })

  const loadUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.username.trim() || !form.password || !form.full_name.trim()) {
      setError('Username, password, dan nama lengkap wajib diisi')
      return
    }

    let brandAccess = []
    if (form.role === 'administrator') {
      brandAccess = ['Semua']
    } else if (form.role === 'admin_brand') {
      brandAccess = [form.brand_access]
    } else {
      // approver
      if (form.approver_level >= 4) {
        brandAccess = ['Semua']
      } else {
        brandAccess = [form.brand_access]
      }
    }

    const payload = {
      username: form.username.trim().toLowerCase(),
      password_hash: form.password,
      full_name: form.full_name.trim(),
      role: form.role,
      brand_access: brandAccess,
      approver_level: form.role === 'approver' ? Number(form.approver_level) : null,
      is_active: true
    }

    const { error: insertError } = await supabase.from('users').insert([payload])

    if (insertError) {
      if (insertError.code === '23505') {
        setError('Username sudah dipakai')
      } else {
        setError(insertError.message || 'Gagal menambah user')
      }
      return
    }

    setSuccess('User berhasil ditambahkan')
    setForm({
      username: '',
      password: '',
      full_name: '',
      role: 'admin_brand',
      brand_access: 'Herbacare',
      approver_level: 1
    })
    setShowForm(false)
    loadUsers()
  }

  const toggleActive = async (u) => {
    const { error } = await supabase
      .from('users')
      .update({ is_active: !u.is_active })
      .eq('id', u.id)
    if (!error) loadUsers()
  }

  const roleLabel = (role, level) => {
    if (role === 'administrator') return 'Administrator'
    if (role === 'admin_brand') return 'Admin Brand'
    return `Approver Level ${level || '-'}`
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', color: '#1F4E79' }}>Kelola User</h1>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess('') }}
          style={styles.primaryBtn}
        >
          {showForm ? 'Tutup Form' : '+ Tambah User'}
        </button>
      </div>

      {success && <div style={styles.success}>{success}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {showForm && (
        <div style={styles.card}>
          <h3 style={{ marginBottom: '1rem', color: '#1F4E79' }}>Tambah User Baru</h3>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Username *</label>
                <input name="username" value={form.username} onChange={handleChange} style={styles.input} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Password *</label>
                <input name="password" type="text" value={form.password} onChange={handleChange} style={styles.input} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Nama Lengkap *</label>
                <input name="full_name" value={form.full_name} onChange={handleChange} style={styles.input} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Role *</label>
                <select name="role" value={form.role} onChange={handleChange} style={styles.input}>
                  <option value="admin_brand">Admin Brand</option>
                  <option value="approver">Approver</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>

              {(form.role === 'admin_brand' || (form.role === 'approver' && Number(form.approver_level) < 4)) && (
                <div style={styles.field}>
                  <label style={styles.label}>Brand</label>
                  <select name="brand_access" value={form.brand_access} onChange={handleChange} style={styles.input}>
                    <option value="Herbacare">Herbacare</option>
                    <option value="Madu">Madu</option>
                    <option value="Jelly">Jelly</option>
                  </select>
                </div>
              )}

              {form.role === 'approver' && (
                <div style={styles.field}>
                  <label style={styles.label}>Level Approver</label>
                  <select name="approver_level" value={form.approver_level} onChange={handleChange} style={styles.input}>
                    <option value={1}>Level 1 (Executive / Manager)</option>
                    <option value={2}>Level 2 (Head of Marketing)</option>
                    <option value={3}>Level 3 (Finance)</option>
                    <option value={4}>Level 4 (Director / CMO)</option>
                    <option value={5}>Level 5 (CFO / Board)</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ marginTop: '1.25rem' }}>
              <button type="submit" style={styles.primaryBtn}>Simpan User</button>
            </div>
          </form>
        </div>
      )}

      <div style={styles.card}>
        <h3 style={{ marginBottom: '1rem', color: '#1F4E79' }}>Daftar User</h3>
        {loading ? (
          <p>Memuat...</p>
        ) : users.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Belum ada user.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Username</th>
                  <th style={styles.th}>Nama</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Brand</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={styles.td}>{u.username}</td>
                    <td style={styles.td}>{u.full_name}</td>
                    <td style={styles.td}>{roleLabel(u.role, u.approver_level)}</td>
                    <td style={styles.td}>{(u.brand_access || []).join(', ')}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: u.is_active ? '#d1fae5' : '#fee2e2',
                        color: u.is_active ? '#065f46' : '#991b1b'
                      }}>
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => toggleActive(u)}
                          style={styles.smallBtn}
                        >
                          {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  card: {
    background: 'white',
    borderRadius: '10px',
    padding: '1.25rem',
    border: '1px solid #e5e7eb',
    marginBottom: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  primaryBtn: {
    background: '#1F4E79',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.6rem 1.1rem',
    fontWeight: 600,
    fontSize: '0.9rem'
  },
  smallBtn: {
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '0.3rem 0.6rem',
    fontSize: '0.8rem'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' },
  input: {
    padding: '0.55rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.95rem'
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  th: {
    textAlign: 'left',
    padding: '0.65rem 0.75rem',
    background: '#1F4E79',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.8rem'
  },
  td: { padding: '0.65rem 0.75rem', borderBottom: '1px solid #e5e7eb' },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  success: {
    background: '#ecfdf5',
    color: '#065f46',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  }
}
