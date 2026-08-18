import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Layout({ user, onLogout }) {
  const [pendingCount, setPendingCount] = useState(0)

  const roleLabel = {
    administrator: 'Administrator',
    admin_brand: 'Admin Brand',
    approver: `Approver Level ${user.approver_level || '-'}`
  }

  useEffect(() => {
    if (user.role !== 'approver') return

    let cancelled = false

    const loadPending = async () => {
      const level = Number(user.approver_level) || 0
      const isHighLevel = level >= 4
      const brandAccess = user.brand_access || []

      const { data: progs } = await supabase
        .from('programs')
        .select('id, brand, current_level, required_level, status')
        .in('status', ['Menunggu Approval', 'Revisi'])

      let list = progs || []
      if (!isHighLevel && !brandAccess.includes('Semua')) {
        list = list.filter(p => brandAccess.includes(p.brand))
      }

      const candidates = list.filter(p => {
        const next = Math.max(1, (p.current_level || 0) + 1)
        return level === Math.min(next, p.required_level || 1)
      })

      let progCount = 0
      if (level === 1 && candidates.length > 0) {
        const ids = candidates.map(p => p.id)
        const { data: logs } = await supabase
          .from('approval_logs')
          .select('program_id, user_id, action, level')
          .in('program_id', ids)
          .eq('level', 1)
          .eq('action', 'Approve')
        const already = new Set(
          (logs || []).filter(l => l.user_id === user.id).map(l => l.program_id)
        )
        progCount = candidates.filter(p => !already.has(p.id)).length
      } else {
        progCount = candidates.length
      }

      // Addendums pending for this user
      const { data: ads } = await supabase
        .from('addendums')
        .select('id, brand, current_level, required_level, status')
        .eq('status', 'Menunggu Approval')

      let adList = ads || []
      if (!isHighLevel && !brandAccess.includes('Semua')) {
        adList = adList.filter(a => brandAccess.includes(a.brand))
      }
      const adCandidates = adList.filter(a => {
        const next = Math.max(1, (a.current_level || 0) + 1)
        return level === Math.min(next, a.required_level || 1)
      })

      let adCount = 0
      if (level === 1 && adCandidates.length > 0) {
        const ids = adCandidates.map(a => a.id)
        const { data: aLogs } = await supabase
          .from('approval_logs')
          .select('addendum_id, user_id, action, level')
          .in('addendum_id', ids)
          .eq('level', 1)
          .eq('action', 'Approve')
        const already = new Set(
          (aLogs || []).filter(l => l.user_id === user.id).map(l => l.addendum_id)
        )
        adCount = adCandidates.filter(a => !already.has(a.id)).length
      } else {
        adCount = adCandidates.length
      }

      if (!cancelled) setPendingCount(progCount + adCount)
    }

    loadPending()
    const interval = setInterval(loadPending, 30000) // refresh tiap 30 detik
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [user])

  const linkStyle = ({ isActive }) => ({
    padding: '0.85rem 1.5rem',
    cursor: 'pointer',
    opacity: isActive ? 1 : 0.85,
    background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
    borderLeft: isActive ? '3px solid #5dade2' : '3px solid transparent',
    fontWeight: isActive ? 600 : 400,
    fontSize: '0.95rem',
    color: 'white',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem'
  })

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Budget Marketing</h2>
          <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>Sistem Anggaran</p>
        </div>

        <nav style={styles.nav}>
          <NavLink to="/" end style={linkStyle}>Dashboard</NavLink>

          {(user.role === 'administrator' || user.role === 'admin_brand' || user.role === 'approver') && (
            <NavLink to="/programs" style={linkStyle}>Program Tracker</NavLink>
          )}

          {user.role === 'approver' && (
            <NavLink to="/approval" style={linkStyle}>
              <span>Approval</span>
              {pendingCount > 0 && (
                <span style={styles.badge}>{pendingCount > 99 ? '99+' : pendingCount}</span>
              )}
            </NavLink>
          )}

          {(user.role === 'administrator' || user.role === 'admin_brand') && (
            <NavLink to="/budgeting" style={linkStyle}>Budgeting</NavLink>
          )}

          {user.role === 'administrator' && (
            <NavLink to="/users" style={linkStyle}>Kelola User</NavLink>
          )}
        </nav>

        <div style={styles.userBox}>
          <div style={{ fontWeight: 600 }}>{user.full_name}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{roleLabel[user.role] || user.role}</div>
          <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: '260px',
    background: '#1F4E79',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 0'
  },
  logo: {
    padding: '0 1.5rem 1.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.15)',
    marginBottom: '1rem'
  },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  badge: {
    background: '#ef4444',
    color: 'white',
    fontSize: '0.7rem',
    fontWeight: 700,
    minWidth: '20px',
    height: '20px',
    borderRadius: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
    lineHeight: 1
  },
  userBox: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid rgba(255,255,255,0.15)',
    fontSize: '0.9rem'
  },
  logoutBtn: {
    marginTop: '0.75rem',
    width: '100%',
    padding: '0.5rem',
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', background: '#f4f6f9' },
  content: { padding: '1.5rem 1.75rem', flex: 1 }
}
