export default function Dashboard({ user }) {
  const roleLabel = {
    administrator: 'Administrator',
    admin_brand: 'Admin Brand',
    approver: `Approver Level ${user.approver_level || '-'}`
  }

  const brandText = Array.isArray(user.brand_access)
    ? user.brand_access.join(', ')
    : (user.brand_access || '-')

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', color: '#1F4E79', marginBottom: '1.25rem' }}>Dashboard</h1>

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
            Login berhasil.
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
          <li>Dashboard sesuai role</li>
          <li><strong>Kelola User</strong> (tambah Admin Brand & Approver)</li>
        </ul>
        <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
          Fitur berikutnya: Program Tracker, Approval berjenjang, Budgeting, Output PDF.
        </p>
      </div>
    </div>
  )
}

const styles = {
  welcome: { marginBottom: '1.5rem' },
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
  cardLabel: { fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.35rem' },
  cardValue: { fontSize: '1.25rem', fontWeight: 700, color: '#1F4E79' }
}
