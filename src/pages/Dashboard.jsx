import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

const BRANDS = ['Herbacare', 'Madu', 'Jelly']

function formatRp(num) {
  if (num == null || num === '') return 'Rp 0'
  const n = Number(num)
  const formatted = Math.abs(n).toLocaleString('id-ID')
  return (n < 0 ? '-Rp ' : 'Rp ') + formatted
}

export default function Dashboard({ user }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    waiting: 0,
    revisi: 0,
    approved: 0,
    draft: 0,
    rejected: 0,
    totalPrograms: 0
  })
  const [brandSummary, setBrandSummary] = useState([])
  const [recentPrograms, setRecentPrograms] = useState([])

  const year = new Date().getFullYear()
  const isAdmin = user.role === 'administrator'
  const isAdminBrand = user.role === 'admin_brand'
  const isApprover = user.role === 'approver'

  const allowedBrands = isAdmin
    ? BRANDS
    : (user.brand_access || []).filter(b => b !== 'Semua' && BRANDS.includes(b))

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)

    // Programs
    let progQuery = supabase.from('programs').select('*').order('created_at', { ascending: false })
    const { data: progs } = await progQuery
    let programs = progs || []

    if (!isAdmin && allowedBrands.length > 0) {
      programs = programs.filter(p => allowedBrands.includes(p.brand))
    }

    const counts = {
      waiting: programs.filter(p => p.status === 'Menunggu Approval').length,
      revisi: programs.filter(p => p.status === 'Revisi').length,
      approved: programs.filter(p => p.status === 'Approved').length,
      draft: programs.filter(p => p.status === 'Draft').length,
      rejected: programs.filter(p => p.status === 'Rejected').length,
      totalPrograms: programs.length
    }
    setStats(counts)
    setRecentPrograms(programs.slice(0, 5))

    // Budget summary
    const { data: ba } = await supabase.from('brand_budgets').select('*').eq('year', year)
    const allocMap = {}
    BRANDS.forEach(b => { allocMap[b] = 0 })
    ;(ba || []).forEach(r => { allocMap[r.brand] = Number(r.allocation) || 0 })

    const approved = programs.filter(p => p.status === 'Approved')
    const realMap = {}
    BRANDS.forEach(b => { realMap[b] = 0 })
    approved.forEach(p => {
      if (realMap[p.brand] != null) realMap[p.brand] += Number(p.budget_amount) || 0
    })

    const summary = (isAdmin ? BRANDS : allowedBrands).map(b => ({
      brand: b,
      allocation: allocMap[b] || 0,
      realized: realMap[b] || 0,
      remaining: (allocMap[b] || 0) - (realMap[b] || 0)
    }))
    setBrandSummary(summary)
    setLoading(false)
  }

  const roleLabel = {
    administrator: 'Administrator',
    admin_brand: 'Admin Brand',
    approver: `Approver Level ${user.approver_level || '-'}`
  }

  const cardStyle = (color) => ({
    background: 'white',
    borderRadius: '10px',
    padding: '1.1rem 1.25rem',
    border: '1px solid #e5e7eb',
    borderLeft: `4px solid ${color}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    flex: '1 1 140px',
    minWidth: '140px'
  })

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', color: '#1F4E79', marginBottom: '0.25rem' }}>Dashboard</h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Halo, <strong>{user.full_name}</strong> · {roleLabel[user.role] || user.role}
          {(allowedBrands.length > 0 && !isAdmin) ? ` · Brand: ${allowedBrands.join(', ')}` : ''}
        </p>
      </div>

      {loading ? (
        <p>Memuat ringkasan...</p>
      ) : (
        <>
          {/* Status cards */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1.5rem' }}>
            <div style={cardStyle('#f59e0b')}>
              <div style={styles.cardLabel}>Menunggu Approval</div>
              <div style={{ ...styles.cardValue, color: '#d97706' }}>{stats.waiting}</div>
            </div>
            <div style={cardStyle('#f97316')}>
              <div style={styles.cardLabel}>Revisi</div>
              <div style={{ ...styles.cardValue, color: '#ea580c' }}>{stats.revisi}</div>
            </div>
            <div style={cardStyle('#10b981')}>
              <div style={styles.cardLabel}>Approved</div>
              <div style={{ ...styles.cardValue, color: '#059669' }}>{stats.approved}</div>
            </div>
            <div style={cardStyle('#6b7280')}>
              <div style={styles.cardLabel}>Draft</div>
              <div style={styles.cardValue}>{stats.draft}</div>
            </div>
            <div style={cardStyle('#1F4E79')}>
              <div style={styles.cardLabel}>Total Program</div>
              <div style={{ ...styles.cardValue, color: '#1F4E79' }}>{stats.totalPrograms}</div>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {(isAdmin || isAdminBrand || isApprover) && (
              <Link to="/programs" style={styles.linkBtn}>Program Tracker</Link>
            )}
            {isApprover && (
              <Link to="/approval" style={{ ...styles.linkBtn, background: stats.waiting ? '#d97706' : '#1F4E79' }}>
                Approval {stats.waiting > 0 ? `(${stats.waiting})` : ''}
              </Link>
            )}
            {(isAdmin || isAdminBrand) && (
              <Link to="/budgeting" style={styles.linkBtn}>Budgeting</Link>
            )}
            {isAdmin && (
              <Link to="/users" style={styles.linkBtn}>Kelola User</Link>
            )}
          </div>

          {/* Budget per brand */}
          {(isAdmin || isAdminBrand) && brandSummary.length > 0 && (
            <div style={styles.card}>
              <h3 style={{ color: '#1F4E79', marginBottom: '1rem' }}>Ringkasan Budget {year}</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Brand</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Alokasi</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Realisasi</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Sisa</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>% Terpakai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandSummary.map(b => {
                      const pct = b.allocation > 0 ? Math.round((b.realized / b.allocation) * 100) : 0
                      return (
                        <tr key={b.brand}>
                          <td style={styles.td}><strong>{b.brand}</strong></td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>{formatRp(b.allocation)}</td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>{formatRp(b.realized)}</td>
                          <td style={{
                            ...styles.td,
                            textAlign: 'right',
                            fontWeight: 600,
                            color: b.remaining < 0 ? '#dc2626' : '#059669'
                          }}>
                            {formatRp(b.remaining)}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            <span style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '10px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              background: pct > 90 ? '#fee2e2' : pct > 70 ? '#fef3c7' : '#d1fae5',
                              color: pct > 90 ? '#991b1b' : pct > 70 ? '#92400e' : '#065f46'
                            }}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <h4 style={{ color: '#1F4E79', margin: '1.25rem 0 0.75rem', fontSize: '0.95rem' }}>Penggunaan Budget</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {brandSummary.map(b => {
                  const pct = b.allocation > 0 ? Math.min(100, Math.round((b.realized / b.allocation) * 100)) : 0
                  const barColor = pct > 90 ? '#dc2626' : pct > 70 ? '#d97706' : '#059669'
                  return (
                    <div key={'bar-' + b.brand}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600 }}>{b.brand}</span>
                        <span style={{ color: '#6b7280' }}>{formatRp(b.realized)} / {formatRp(b.allocation)} ({pct}%)</span>
                      </div>
                      <div style={{ background: '#e5e7eb', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                        <div style={{
                          width: pct + '%',
                          height: '100%',
                          background: barColor,
                          borderRadius: '6px',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Status distribution */}
          <div style={styles.card}>
            <h3 style={{ color: '#1F4E79', marginBottom: '1rem' }}>Distribusi Status Program</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { key: 'waiting', label: 'Menunggu Approval', color: '#d97706', n: stats.waiting },
                { key: 'revisi', label: 'Revisi', color: '#ea580c', n: stats.revisi },
                { key: 'approved', label: 'Approved', color: '#059669', n: stats.approved },
                { key: 'draft', label: 'Draft', color: '#6b7280', n: stats.draft },
                { key: 'rejected', label: 'Rejected', color: '#dc2626', n: stats.rejected }
              ].map(item => {
                const max = Math.max(stats.totalPrograms, 1)
                const pct = Math.round((item.n / max) * 100)
                return (
                  <div key={item.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                      <span>{item.label}</span>
                      <span style={{ fontWeight: 600 }}>{item.n}</span>
                    </div>
                    <div style={{ background: '#e5e7eb', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ width: pct + '%', height: '100%', background: item.color, borderRadius: '6px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent programs */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#1F4E79' }}>Program Terbaru</h3>
              {(isAdmin || isAdminBrand || isApprover) && (
                <Link to="/programs" style={{ fontSize: '0.85rem', color: '#1F4E79' }}>Lihat semua →</Link>
              )}
            </div>
            {recentPrograms.length === 0 ? (
              <p style={{ color: '#6b7280' }}>Belum ada program.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Program</th>
                      <th style={styles.th}>Brand</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Dana</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPrograms.map(p => {
                      const sc = {
                        'Draft': { bg: '#f3f4f6', color: '#374151' },
                        'Menunggu Approval': { bg: '#fef3c7', color: '#92400e' },
                        'Revisi': { bg: '#ffedd5', color: '#9a3412' },
                        'Approved': { bg: '#d1fae5', color: '#065f46' },
                        'Rejected': { bg: '#fee2e2', color: '#991b1b' }
                      }[p.status] || { bg: '#f3f4f6', color: '#374151' }
                      return (
                        <tr key={p.id}>
                          <td style={styles.td}><strong>{p.name}</strong></td>
                          <td style={styles.td}>{p.brand}</td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>{formatRp(p.budget_amount)}</td>
                          <td style={styles.td}>
                            <span style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: sc.bg,
                              color: sc.color
                            }}>
                              {p.status}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
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
  cardLabel: { fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.35rem' },
  cardValue: { fontSize: '1.5rem', fontWeight: 700, color: '#374151' },
  linkBtn: {
    display: 'inline-block',
    background: '#1F4E79',
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 600
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  th: {
    textAlign: 'left',
    padding: '0.55rem 0.65rem',
    background: '#1F4E79',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.8rem'
  },
  td: { padding: '0.55rem 0.65rem', borderBottom: '1px solid #e5e7eb' }
}
