import { NavLink, Outlet } from 'react-router-dom'

export default function Layout({ user, onLogout }) {
  const roleLabel = {
    administrator: 'Administrator',
    admin_brand: 'Admin Brand',
    approver: `Approver Level ${user.approver_level || '-'}`
  }

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
    display: 'block'
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
            <NavLink to="/approval" style={linkStyle}>Approval</NavLink>
          )}

          {(user.role === 'administrator' || user.role === 'admin_brand') && (
            <div style={styles.navDisabled}>Budgeting</div>
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
  navDisabled: {
    padding: '0.85rem 1.5rem',
    opacity: 0.45,
    fontSize: '0.95rem',
    cursor: 'default'
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
