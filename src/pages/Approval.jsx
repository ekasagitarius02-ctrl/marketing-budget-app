import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function formatRp(num) {
  if (num == null || num === '') return '-'
  const n = Number(num)
  const formatted = Math.abs(n).toLocaleString('id-ID')
  return (n < 0 ? '-Rp ' : 'Rp ') + formatted
}

function shortId(id) {
  if (!id) return '-'
  return String(id).slice(0, 8).toUpperCase()
}

export default function Approval({ user }) {
  const [programs, setPrograms] = useState([])
  const [logs, setLogs] = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [acting, setActing] = useState(false)
  const [addendums, setAddendums] = useState([])
  const [adLogs, setAdLogs] = useState({})
  const [selectedAd, setSelectedAd] = useState(null)

  const level = user.approver_level
  const isHighLevel = level >= 4
  const brandAccess = user.brand_access || []

  const loadData = async () => {
    setLoading(true)

    // Ambil program yang masih menunggu approval / revisi
    let query = supabase
      .from('programs')
      .select('*')
      .in('status', ['Menunggu Approval', 'Revisi'])
      .order('created_at', { ascending: true })

    const { data: progs, error: pErr } = await query
    if (pErr) {
      setError(pErr.message)
      setLoading(false)
      return
    }

    // Filter brand untuk level < 4
    let filtered = progs || []
    if (!isHighLevel && !brandAccess.includes('Semua')) {
      filtered = filtered.filter(p => brandAccess.includes(p.brand))
    }

    // Ambil semua approval logs untuk program-program ini
    const ids = filtered.map(p => p.id)
    let logMap = {}
    if (ids.length > 0) {
      const { data: allLogs } = await supabase
        .from('approval_logs')
        .select('*')
        .in('program_id', ids)
        .order('created_at', { ascending: true })
      ;(allLogs || []).forEach(l => {
        if (!logMap[l.program_id]) logMap[l.program_id] = []
        logMap[l.program_id].push(l)
      })
    }

    setLogs(logMap)
    setPrograms(filtered)

    // Addendums waiting
    const { data: ads } = await supabase
      .from('addendums')
      .select('*')
      .in('status', ['Menunggu Approval'])
      .order('created_at', { ascending: true })
    let adList = ads || []
    if (!isHighLevel && !brandAccess.includes('Semua')) {
      adList = adList.filter(a => brandAccess.includes(a.brand))
    }
    const adIds = adList.map(a => a.id)
    let adLogMap = {}
    if (adIds.length > 0) {
      const { data: aLogs } = await supabase
        .from('approval_logs')
        .select('*')
        .in('addendum_id', adIds)
        .order('created_at', { ascending: true })
      ;(aLogs || []).forEach(l => {
        if (!adLogMap[l.addendum_id]) adLogMap[l.addendum_id] = []
        adLogMap[l.addendum_id].push(l)
      })
    }
    setAdLogs(adLogMap)
    setAddendums(adList)

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Hitung level yang sedang dibutuhkan (next level)
  const getNextLevel = (p) => {
    const pLogs = logs[p.id] || []
    // current_level di DB = level terakhir yang sudah "selesai"
    // next = current_level + 1, minimal 1
    const next = Math.max(1, (p.current_level || 0) + 1)
    return Math.min(next, p.required_level || 1)
  }

  // Cek apakah user ini boleh approve program ini sekarang
  const canActOn = (p) => {
    if (user.role !== 'approver') return false
    const next = getNextLevel(p)
    if (level !== next) return false

    // Brand check
    if (!isHighLevel && !brandAccess.includes('Semua') && !brandAccess.includes(p.brand)) {
      return false
    }

    // Level 1: belum approve oleh user ini
    if (next === 1) {
      const pLogs = logs[p.id] || []
      const already = pLogs.some(
        l => l.level === 1 && l.action === 'Approve' && l.user_id === user.id
      )
      if (already) return false
    }

    return true
  }

  // Status Level 1: berapa yang sudah approve
  const level1Progress = (p) => {
    const pLogs = logs[p.id] || []
    const approves = pLogs.filter(l => l.level === 1 && l.action === 'Approve')
    const uniqueUsers = [...new Set(approves.map(l => l.user_id))]
    return uniqueUsers.length
  }

  const getNextLevelAd = (a) => {
    const next = Math.max(1, (a.current_level || 0) + 1)
    return Math.min(next, a.required_level || 1)
  }

  const canActOnAd = (a) => {
    if (user.role !== 'approver') return false
    const next = getNextLevelAd(a)
    if (level !== next) return false
    if (!isHighLevel && !brandAccess.includes('Semua') && !brandAccess.includes(a.brand)) return false
    if (next === 1) {
      const logs = adLogs[a.id] || []
      if (logs.some(l => l.level === 1 && l.action === 'Approve' && l.user_id === user.id)) return false
    }
    return true
  }

  const level1ProgressAd = (a) => {
    const logs = adLogs[a.id] || []
    const unique = [...new Set(logs.filter(l => l.level === 1 && l.action === 'Approve').map(l => l.user_id))]
    return unique.length
  }

  const handleAdAction = async (action) => {
    if (!selectedAd) return
    setActing(true)
    setError('')
    setSuccess('')
    const a = selectedAd
    const next = getNextLevelAd(a)

    const { error: logErr } = await supabase.from('approval_logs').insert([{
      program_id: null,
      addendum_id: a.id,
      user_id: user.id,
      level: next,
      action: action,
      notes: notes.trim() || null
    }])
    if (logErr) {
      setError(logErr.message || 'Gagal menyimpan approval addendum')
      setActing(false)
      return
    }

    let newStatus = a.status
    let newCurrentLevel = a.current_level || 0

    if (action === 'Reject') {
      newStatus = 'Rejected'
    } else if (action === 'Revisi') {
      newStatus = 'Rejected' // addendum tidak revisi, anggap tolak untuk diajukan ulang
    } else if (action === 'Approve') {
      if (next === 1) {
        const logs = adLogs[a.id] || []
        const unique = new Set(logs.filter(l => l.level === 1 && l.action === 'Approve').map(l => l.user_id))
        unique.add(user.id)
        if (unique.size >= 2) {
          newCurrentLevel = 1
          if (a.required_level <= 1) newStatus = 'Approved'
        }
      } else {
        newCurrentLevel = next
        if (next >= a.required_level) newStatus = 'Approved'
      }
    }

    const { error: upErr } = await supabase
      .from('addendums')
      .update({ status: newStatus, current_level: newCurrentLevel, updated_at: new Date().toISOString() })
      .eq('id', a.id)
    if (upErr) {
      setError(upErr.message || 'Gagal update addendum')
      setActing(false)
      return
    }

    // Jika fully approved → tambah alokasi brand_budgets
    if (newStatus === 'Approved') {
      const { data: existing } = await supabase
        .from('brand_budgets')
        .select('id, allocation')
        .eq('year', a.year)
        .eq('brand', a.brand)
        .maybeSingle()
      if (existing?.id) {
        await supabase
          .from('brand_budgets')
          .update({ allocation: Number(existing.allocation || 0) + Number(a.amount) })
          .eq('id', existing.id)
      } else {
        await supabase.from('brand_budgets').insert([{
          year: a.year,
          brand: a.brand,
          allocation: Number(a.amount)
        }])
      }
      // log budget change
      await supabase.from('budget_logs').insert([{
        user_id: user.id,
        year: a.year,
        brand: a.brand,
        field_type: 'allocation',
        month: null,
        old_value: existing ? Number(existing.allocation || 0) : 0,
        new_value: (existing ? Number(existing.allocation || 0) : 0) + Number(a.amount)
      }])
    }

    setSuccess(action === 'Approve' ? 'Addendum di-approve' : 'Addendum ditolak')
    setSelectedAd(null)
    setNotes('')
    setActing(false)
    loadData()
  }

  const handleAction = async (action) => {
    if (!selected) return
    setActing(true)
    setError('')
    setSuccess('')

    const p = selected
    const next = getNextLevel(p)

    // Insert log
    const { error: logErr } = await supabase.from('approval_logs').insert([{
      program_id: p.id,
      user_id: user.id,
      level: next,
      action: action,
      notes: notes.trim() || null
    }])

    if (logErr) {
      setError(logErr.message || 'Gagal menyimpan approval')
      setActing(false)
      return
    }

    let newStatus = p.status
    let newCurrentLevel = p.current_level || 0

    if (action === 'Reject') {
      newStatus = 'Rejected'
    } else if (action === 'Revisi') {
      newStatus = 'Revisi'
      newCurrentLevel = 0
    } else if (action === 'Approve') {
      if (next === 1) {
        // Cek apakah sudah 2 orang level 1
        const pLogs = logs[p.id] || []
        const approves = pLogs.filter(l => l.level === 1 && l.action === 'Approve')
        const uniqueUsers = new Set(approves.map(l => l.user_id))
        uniqueUsers.add(user.id)
        if (uniqueUsers.size >= 2) {
          newCurrentLevel = 1
          if (p.required_level <= 1) {
            newStatus = 'Approved'
          }
        }
        // else: masih menunggu 1 approval level 1 lagi, status tetap Menunggu Approval
      } else {
        newCurrentLevel = next
        if (next >= p.required_level) {
          newStatus = 'Approved'
        }
      }
    }

    const { error: upErr } = await supabase
      .from('programs')
      .update({
        status: newStatus,
        current_level: newCurrentLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', p.id)

    if (upErr) {
      setError(upErr.message || 'Gagal update status program')
      setActing(false)
      return
    }

    setSuccess(
      action === 'Approve' ? 'Berhasil di-approve' :
      action === 'Reject' ? 'Program ditolak' :
      'Diminta revisi'
    )
    setSelected(null)
    setNotes('')
    setActing(false)
    loadData()
  }

  const waitingForMe = programs.filter(canActOn)
  const others = programs.filter(p => !canActOn(p))

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', color: '#1F4E79', marginBottom: '0.5rem' }}>Approval</h1>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Role Anda: Approver Level {level}
        {isHighLevel ? ' (semua brand)' : ` · Brand: ${(brandAccess || []).join(', ')}`}
      </p>

      {success && <div style={styles.success}>{success}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <p>Memuat...</p>
      ) : (
        <>
          <div style={styles.card}>
            <h3 style={{ color: '#1F4E79', marginBottom: '1rem' }}>
              Menunggu Approval Anda ({waitingForMe.length})
            </h3>
            {waitingForMe.length === 0 ? (
              <p style={{ color: '#6b7280' }}>Tidak ada pengajuan yang perlu Anda approve saat ini.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {waitingForMe.map(p => (
                  <div key={p.id} style={styles.item}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {p.brand} · {formatRp(p.budget_amount)} · Level {p.required_level}
                        {getNextLevel(p) === 1 && (
                          <span> · Progress L1: {level1Progress(p)}/2</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        No: {shortId(p.id)} · {p.created_at ? new Date(p.created_at).toLocaleString('id-ID') : ''}
                      </div>
                    </div>
                    <button onClick={() => { setSelected(p); setNotes(''); setError('') }} style={styles.primaryBtn}>
                      Proses
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Addendum waiting */}
          {(() => {
            const waitingAds = addendums.filter(canActOnAd)
            if (waitingAds.length === 0) return null
            return (
              <div style={styles.card}>
                <h3 style={{ color: '#1F4E79', marginBottom: '1rem' }}>
                  Addendum Menunggu Anda ({waitingAds.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {waitingAds.map(a => (
                    <div key={a.id} style={styles.item}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>Addendum {a.brand} · {formatRp(a.amount)}</div>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          Tahun {a.year} · Level {a.required_level}
                          {getNextLevelAd(a) === 1 && <span> · Progress L1: {level1ProgressAd(a)}/2</span>}
                        </div>
                        {a.reason && (
                          <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                            {a.reason.slice(0, 80)}{a.reason.length > 80 ? '...' : ''}
                          </div>
                        )}
                      </div>
                      <button onClick={() => { setSelectedAd(a); setSelected(null); setNotes(''); setError('') }} style={styles.primaryBtn}>
                        Proses
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {others.length > 0 && (
            <div style={styles.card}>
              <h3 style={{ color: '#1F4E79', marginBottom: '1rem' }}>
                Pengajuan Lain (bukan giliran Anda)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Program</th>
                      <th style={styles.th}>Brand</th>
                      <th style={styles.th}>Dana</th>
                      <th style={styles.th}>Butuh Level</th>
                      <th style={styles.th}>Saat ini</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {others.map(p => (
                      <tr key={p.id}>
                        <td style={styles.td}>{p.name}</td>
                        <td style={styles.td}>{p.brand}</td>
                        <td style={styles.td}>{formatRp(p.budget_amount)}</td>
                        <td style={styles.td}>L{p.required_level}</td>
                        <td style={styles.td}>Menunggu L{getNextLevel(p)}</td>
                        <td style={styles.td}>{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal proses */}
      {selected && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ color: '#1F4E79', marginBottom: '1rem' }}>Proses Approval</h3>
            <div style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>
              <div><strong>{selected.name}</strong></div>
              <div style={{ color: '#6b7280', marginTop: '0.35rem' }}>
                {selected.brand} · {formatRp(selected.budget_amount)} · No: {shortId(selected.id)}
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                Level yang Anda proses: <strong>Level {getNextLevel(selected)}</strong>
                {getNextLevel(selected) === 1 && (
                  <span> (progress {level1Progress(selected)}/2)</span>
                )}
              </div>
              {selected.description && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                  {selected.description.replace(/\[REF:[^\]]+\]/, '').trim()}
                </div>
              )}
            </div>

            {/* History singkat */}
            {(logs[selected.id] || []).length > 0 && (
              <div style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
                <strong>Riwayat:</strong>
                <ul style={{ margin: '0.35rem 0 0 1.1rem', color: '#6b7280' }}>
                  {(logs[selected.id] || []).map(l => (
                    <li key={l.id}>
                      L{l.level} · {l.action} · {l.created_at ? new Date(l.created_at).toLocaleString('id-ID') : ''}
                      {l.notes ? ` — ${l.notes}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>Catatan (opsional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ ...styles.input, width: '100%', minHeight: '70px', marginTop: '0.35rem' }}
                placeholder="Alasan approve / reject / revisi"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                disabled={acting}
                onClick={() => handleAction('Approve')}
                style={{ ...styles.primaryBtn, background: '#059669' }}
              >
                Approve
              </button>
              <button
                disabled={acting}
                onClick={() => handleAction('Revisi')}
                style={{ ...styles.primaryBtn, background: '#d97706' }}
              >
                Minta Revisi
              </button>
              <button
                disabled={acting}
                onClick={() => handleAction('Reject')}
                style={{ ...styles.primaryBtn, background: '#dc2626' }}
              >
                Reject
              </button>
              <button
                disabled={acting}
                onClick={() => setSelected(null)}
                style={styles.secondaryBtn}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAd && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ color: '#1F4E79', marginBottom: '1rem' }}>Proses Addendum</h3>
            <div style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>
              <div><strong>Addendum {selectedAd.brand}</strong></div>
              <div style={{ color: '#6b7280', marginTop: '0.35rem' }}>
                {formatRp(selectedAd.amount)} · Tahun {selectedAd.year}
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                Level: <strong>L{getNextLevelAd(selectedAd)}</strong>
                {getNextLevelAd(selectedAd) === 1 && <span> (progress {level1ProgressAd(selectedAd)}/2)</span>}
              </div>
              {selectedAd.reason && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>{selectedAd.reason}</div>
              )}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>Catatan (opsional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ ...styles.input, width: '100%', minHeight: '70px', marginTop: '0.35rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button disabled={acting} onClick={() => handleAdAction('Approve')} style={{ ...styles.primaryBtn, background: '#059669' }}>
                Approve
              </button>
              <button disabled={acting} onClick={() => handleAdAction('Reject')} style={{ ...styles.primaryBtn, background: '#dc2626' }}>
                Reject
              </button>
              <button disabled={acting} onClick={() => setSelectedAd(null)} style={styles.secondaryBtn}>
                Batal
              </button>
            </div>
          </div>
        </div>
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
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.85rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#f9fafb'
  },
  primaryBtn: {
    background: '#1F4E79',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.55rem 1rem',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  secondaryBtn: {
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '0.55rem 1rem',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  input: {
    padding: '0.55rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.95rem'
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: {
    textAlign: 'left',
    padding: '0.55rem 0.65rem',
    background: '#1F4E79',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.75rem'
  },
  td: { padding: '0.55rem 0.65rem', borderBottom: '1px solid #e5e7eb' },
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
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '1rem'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto'
  }
}
