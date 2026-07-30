import { useState } from 'react'

export default function Dashboard({ user, onLogout }) {
  const roleLabel = {
    administrator: 'Administrator',
    admin_brand: 'Admin Brand',
    approver: `Approver Level ${user.approver_level || '-'}`
  }

  const brandText = Array.isArray(user.brand_access)
    ? user.brand_access.join(', ')
    : (user.brand_access || '-')

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Budget Marketing</h2>
          <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>Sistem Anggaran</p>
        </div>

        <nav style={styles.nav}>
          <div style={{ ...styles.navItem, ...styles.navActive }}>Dashboard</div>
          {(user.role === 'administrator' || user.role === 'admin_brand') && (
            <>
              <div style={styles.navItem}>Program Tracker</div>
              <div style={styles.navItem}>Budgeting</div>
            </>
          )}
          {user.role === 'approver' && (
            <div style={styles.navItem}>Approval</div>
          )}
          {user.role === 'administrator' && (
            <div style={styles.navItem}>Kelola User</div>
          )}
        </nav>

        <div style={styles.userBox}>
          <div style={{ fontWeight: 600 }}>{user.full_name}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{roleLabel[user.role] || user.role}</div>
          <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={{ fontSize: '1.4rem', color: '#1F4E79' }}>Dashboard</h1>
        </header>

        <div style={styles.content}>
          <div style={styles.welcome}>
            <h2>Halo, {user.full_name}</h2>
            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
              Role: <strong>{roleLabel[user.role]}</strong>
              {user.role !== 'administrator' && (
                <> · Brand: <strong>{brandText}</strong></>
              )}
            </p>
          </div>

          <div style={styles.cards}>
            <div style={styles.card}>
              <div style={styles.cardLabel}>Status Sistem</div>
              <div style={styles.cardValue}>Aktif</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Login berhasil. Fitur lengkap sedang dikembangkan tahap demi tahap.
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>Username</div>
              <div style={styles.cardValue}>{user.username}</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>Akses Brand</div>
              <div style={styles.cardValue}>{brandText}</div>
            </div>
          </div>

          <div style={{ ...styles.card, marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.75rem', color: '#1F4E79' }}>Yang sudah tersedia</h3>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: '#374151' }}>
              <li>Login dengan Username + Password</li>
              <li>Pembagian Role (Administrator / Admin Brand / Approver)</li>
              <li>Dashboard sesuai role</li>
            </ul>
            <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
              Fitur berikutnya: Program Tracker, Approval berjenjang, Budgeting, Output PDF, dll.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh'
  },
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
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  navItem: {
    padding: '0.85rem 1.5rem',
    cursor: 'pointer',
    opacity: 0.85,
    fontSize: '0.95rem'
  },
  navActive: {
    background: 'rgba(255,255,255,0.12)',
    borderLeft: '3px solid #5dade2',
    opacity: 1,
    fontWeight: 600
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
    fontSize: '0.85rem'
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    background: 'white',
    padding: '1rem 1.75rem',
    borderBottom: '1px solid #e5e7eb'
  },
  content: {
    padding: '1.5rem 1.75rem',
    flex: 1
  },
  welcome: {
    marginBottom: '1.5rem'
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem'
  },
  card: {
    background: 'white',
    borderRadius: '10px',
    padding: '1.25rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  cardLabel: {
    fontSize: '0.8rem',
    color: '#6b7280',
    marginBottom: '0.35rem'
  },
  cardValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1F4E79'
  }
}
