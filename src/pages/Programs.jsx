import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const BRANDS = ['Herbacare', 'Madu', 'Jelly']

function formatRp(num) {
  if (num == null || num === '') return '-'
  return 'Rp ' + Number(num).toLocaleString('id-ID')
}

function getRequiredLevel(amount) {
  const n = Number(amount) || 0
  if (n <= 5000000) return 1
  if (n <= 15000000) return 2
  if (n <= 50000000) return 3
  if (n <= 150000000) return 4
  return 5
}

export default function Programs({ user }) {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [form, setForm] = useState({
    brand: '',
    name: '',
    description: '',
    budget_amount: '',
    period_start: '',
    period_end: ''
  })

  const isAdmin = user.role === 'administrator'
  const isAdminBrand = user.role === 'admin_brand'
  const canCreate = isAdmin || isAdminBrand

  const allowedBrands = isAdmin
    ? BRANDS
    : (user.brand_access || []).filter(b => b !== 'Semua')

  const loadPrograms = async () => {
    setLoading(true)
    let query = supabase
      .from('programs')
      .select('*')
      .order('created_at', { ascending: false })

    if (!isAdmin && allowedBrands.length > 0) {
      query = query.in('brand', allowedBrands)
    }

    const { data, error } = await query
    if (!error) setPrograms(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadPrograms()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleBudgetChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    setForm(prev => ({ ...prev, budget_amount: raw }))
  }

  const resetForm = () => {
    setForm({
      brand: allowedBrands[0] || '',
      name: '',
      description: '',
      budget_amount: '',
      period_start: '',
      period_end: ''
    })
    setShowForm(false)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.brand || !form.name.trim() || !form.budget_amount) {
      setError('Brand, Nama Program, dan Estimasi Dana wajib diisi')
      return
    }

    const amount = Number(form.budget_amount)
    if (amount <= 0) {
      setError('Estimasi Dana harus lebih dari 0')
      return
    }

    if (!isAdmin && !allowedBrands.includes(form.brand)) {
      setError('Anda tidak berhak membuat program untuk brand ini')
      return
    }

    const requiredLevel = getRequiredLevel(amount)

    const payload = {
      brand: form.brand,
      name: form.name.trim(),
      description: form.description.trim() || null,
      budget_amount: amount,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      status: 'Menunggu Approval',
      current_level: 0,
      required_level: requiredLevel,
      created_by: user.id
    }

    const { error: insertError } = await supabase.from('programs').insert([payload])

    if (insertError) {
      setError(insertError.message || 'Gagal menyimpan program')
      return
    }

    setSuccess('Program berhasil diajukan dan menunggu approval')
    resetForm()
    loadPrograms()
  }

  const statusColor = (status) => {
    const map = {
      'Draft': { bg: '#f3f4f6', color: '#374151' },
      'Menunggu Approval': { bg: '#fef3c7', color: '#92400e' },
      'Revisi': { bg: '#ffedd5', color: '#9a3412' },
      'Approved': { bg: '#d1fae5', color: '#065f46' },
      'Rejected': { bg: '#fee2e2', color: '#991b1b' }
    }
    return map[status] || map['Draft']
  }

  const filtered = filterStatus === 'Semua'
    ? programs
    : programs.filter(p => p.status === filterStatus)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.4rem', color: '#1F4E79' }}>Program Tracker</h1>
        {canCreate && (
          <button
            onClick={() => {
              if (showForm) resetForm()
              else {
                setForm(prev => ({ ...prev, brand: allowedBrands[0] || '' }))
                setShowForm(true)
                setSuccess('')
                setError('')
              }
            }}
            style={styles.primaryBtn}
          >
            {showForm ? 'Tutup Form' : '+ Buat Program'}
          </button>
        )}
      </div>

      {success && <div style={styles.success}>{success}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {showForm && canCreate && (
        <div style={styles.card}>
          <h3 style={{ marginBottom: '1rem', color: '#1F4E79' }}>Buat Pengajuan Program</h3>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Brand *</label>
                <select name="brand" value={form.brand} onChange={handleChange} style={styles.input} required>
                  <option value="">Pilih Brand</option>
                  {allowedBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Nama Program *</label>
                <input name="name" value={form.name} onChange={handleChange} style={styles.input} required placeholder="Contoh: Campaign Ramadan 2026" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Estimasi Dana (Rp) *</label>
                <input
                  value={form.budget_amount ? Number(form.budget_amount).toLocaleString('id-ID') : ''}
                  onChange={handleBudgetChange}
                  style={styles.input}
                  required
                  placeholder="Contoh: 10000000"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Periode Mulai</label>
                <input type="date" name="period_start" value={form.period_start} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Periode Selesai</label>
                <input type="date" name="period_end" value={form.period_end} onChange={handleChange} style={styles.input} />
              </div>
            </div>
            <div style={{ ...styles.field, marginTop: '1rem' }}>
              <label style={styles.label}>Keterangan Kegiatan</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                placeholder="Jelaskan singkat kegiatan / tujuan program"
              />
            </div>
            {form.budget_amount && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
                Level Approval yang dibutuhkan: <strong>Level {getRequiredLevel(form.budget_amount)}</strong>
              </p>
            )}
            <div style={{ marginTop: '1.25rem' }}>
              <button type="submit" style={styles.primaryBtn}>Kirim untuk Approval</button>
            </div>
          </form>
        </div>
      )}

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ color: '#1F4E79' }}>Daftar Program</h3>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...styles.input, width: 'auto' }}>
            <option value="Semua">Semua Status</option>
            <option value="Menunggu Approval">Menunggu Approval</option>
            <option value="Revisi">Revisi</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <p>Memuat...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Belum ada program.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Tanggal</th>
                  <th style={styles.th}>Brand</th>
                  <th style={styles.th}>Nama Program</th>
                  <th style={styles.th}>Estimasi Dana</th>
                  <th style={styles.th}>Level</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const sc = statusColor(p.status)
                  return (
                    <tr key={p.id}>
                      <td style={styles.td}>{p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : '-'}</td>
                      <td style={styles.td}>{p.brand}</td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.description && (
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
                            {p.description.length > 60 ? p.description.slice(0, 60) + '...' : p.description}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>{formatRp(p.budget_amount)}</td>
                      <td style={styles.td}>L{p.required_level}</td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: sc.bg,
                          color: sc.color
                        }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
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
    fontSize: '0.9rem',
    cursor: 'pointer'
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
  td: { padding: '0.65rem 0.75rem', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' },
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
