import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const BRANDS = ['Herbacare', 'Madu', 'Jelly']
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
]

function formatRp(num) {
  if (num == null || num === '') return 'Rp 0'
  const n = Number(num)
  const formatted = Math.abs(n).toLocaleString('id-ID')
  return (n < 0 ? '-Rp ' : 'Rp ') + formatted
}

function getRequiredLevel(amount) {
  const n = Math.abs(Number(amount) || 0)
  if (n <= 5000000) return 1
  if (n <= 15000000) return 2
  if (n <= 50000000) return 3
  if (n <= 150000000) return 4
  return 5
}

export default function Budgeting({ user }) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [brandAlloc, setBrandAlloc] = useState({})
  const [monthly, setMonthly] = useState({})
  const [realized, setRealized] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [logs, setLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  const [addendums, setAddendums] = useState([])
  const [showAddendumForm, setShowAddendumForm] = useState(false)
  const [adForm, setAdForm] = useState({ brand: '', amount: '', reason: '' })
  const [adError, setAdError] = useState('')
  const [adSuccess, setAdSuccess] = useState('')
  const [showShift, setShowShift] = useState(false)
  const [shiftForm, setShiftForm] = useState({ brand: '', fromMonth: 1, toMonth: 2, amount: '' })
  const [shiftError, setShiftError] = useState('')
  const [shiftSuccess, setShiftSuccess] = useState('')

  const isAdmin = user.role === 'administrator'
  const isAdminBrand = user.role === 'admin_brand'
  const canEdit = isAdmin || isAdminBrand

  const allowedBrands = isAdmin
    ? BRANDS
    : (user.brand_access || []).filter(b => b !== 'Semua' && BRANDS.includes(b))

  const loadData = async () => {
    setLoading(true)
    setError('')

    // Brand annual allocation
    const { data: ba } = await supabase
      .from('brand_budgets')
      .select('*')
      .eq('year', year)

    const allocMap = {}
    BRANDS.forEach(b => { allocMap[b] = 0 })
    ;(ba || []).forEach(r => { allocMap[r.brand] = Number(r.allocation) || 0 })
    setBrandAlloc(allocMap)

    // Monthly plans
    const { data: mb } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('year', year)

    const monthMap = {}
    BRANDS.forEach(b => {
      monthMap[b] = {}
      for (let m = 1; m <= 12; m++) monthMap[b][m] = 0
    })
    ;(mb || []).forEach(r => {
      if (monthMap[r.brand]) {
        monthMap[r.brand][r.month] = Number(r.plan_amount) || 0
      }
    })
    setMonthly(monthMap)

    // Realized from Approved programs (including negative pembalik)
    const { data: progs } = await supabase
      .from('programs')
      .select('brand, budget_amount, period_start, created_at, status')
      .eq('status', 'Approved')

    const realMap = {}
    BRANDS.forEach(b => {
      realMap[b] = { total: 0, byMonth: {} }
      for (let m = 1; m <= 12; m++) realMap[b].byMonth[m] = 0
    })

    ;(progs || []).forEach(p => {
      if (!realMap[p.brand]) return
      const amt = Number(p.budget_amount) || 0
      realMap[p.brand].total += amt
      // gunakan period_start jika ada, else created_at
      const d = p.period_start ? new Date(p.period_start) : new Date(p.created_at)
      if (d.getFullYear() === year) {
        const m = d.getMonth() + 1
        realMap[p.brand].byMonth[m] = (realMap[p.brand].byMonth[m] || 0) + amt
      }
    })
    setRealized(realMap)

    // Load budget change logs
    const { data: logData } = await supabase
      .from('budget_logs')
      .select('*')
      .eq('year', year)
      .order('created_at', { ascending: false })
      .limit(100)

    let enriched = logData || []
    const uids = [...new Set(enriched.map(l => l.user_id).filter(Boolean))]
    if (uids.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, username')
        .in('id', uids)
      const umap = {}
      ;(usersData || []).forEach(u => { umap[u.id] = u })
      enriched = enriched.map(l => ({
        ...l,
        user_name: umap[l.user_id]
          ? (umap[l.user_id].full_name || umap[l.user_id].username)
          : '-'
      }))
    }
    setLogs(enriched)

    // Load addendums for this year
    const { data: adData } = await supabase
      .from('addendums')
      .select('*')
      .eq('year', year)
      .order('created_at', { ascending: false })
    let ads = adData || []
    if (!isAdmin && allowedBrands.length > 0) {
      ads = ads.filter(a => allowedBrands.includes(a.brand))
    }
    setAddendums(ads)

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [year])

  const handleAllocChange = (brand, value) => {
    const raw = String(value).replace(/\D/g, '')
    setBrandAlloc(prev => ({ ...prev, [brand]: raw === '' ? 0 : Number(raw) }))
  }

  const handleMonthChange = (brand, month, value) => {
    const raw = String(value).replace(/\D/g, '')
    setMonthly(prev => ({
      ...prev,
      [brand]: { ...prev[brand], [month]: raw === '' ? 0 : Number(raw) }
    }))
  }

  const saveBudget = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Ambil nilai lama dari DB untuk log
      const { data: oldBA } = await supabase
        .from('brand_budgets')
        .select('*')
        .eq('year', year)
      const { data: oldMB } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('year', year)

      const oldAllocMap = {}
      ;(oldBA || []).forEach(r => { oldAllocMap[r.brand] = Number(r.allocation) || 0 })
      const oldMonthMap = {}
      ;(oldMB || []).forEach(r => {
        if (!oldMonthMap[r.brand]) oldMonthMap[r.brand] = {}
        oldMonthMap[r.brand][r.month] = Number(r.plan_amount) || 0
      })

      const logRows = []

      for (const brand of allowedBrands) {
        const newAlloc = brandAlloc[brand] || 0
        const oldAlloc = oldAllocMap[brand] || 0

        // Upsert brand_budgets
        const { data: existing } = await supabase
          .from('brand_budgets')
          .select('id')
          .eq('year', year)
          .eq('brand', brand)
          .maybeSingle()

        if (existing?.id) {
          await supabase
            .from('brand_budgets')
            .update({ allocation: newAlloc })
            .eq('id', existing.id)
        } else {
          await supabase.from('brand_budgets').insert([{
            year,
            brand,
            allocation: newAlloc
          }])
        }

        if (newAlloc !== oldAlloc) {
          logRows.push({
            user_id: user.id,
            year,
            brand,
            field_type: 'allocation',
            month: null,
            old_value: oldAlloc,
            new_value: newAlloc
          })
        }

        // Upsert monthly
        for (let m = 1; m <= 12; m++) {
          const plan = (monthly[brand] && monthly[brand][m]) || 0
          const oldPlan = (oldMonthMap[brand] && oldMonthMap[brand][m]) || 0

          const { data: exM } = await supabase
            .from('monthly_budgets')
            .select('id')
            .eq('year', year)
            .eq('brand', brand)
            .eq('month', m)
            .maybeSingle()

          if (exM?.id) {
            await supabase
              .from('monthly_budgets')
              .update({ plan_amount: plan })
              .eq('id', exM.id)
          } else {
            await supabase.from('monthly_budgets').insert([{
              year,
              brand,
              month: m,
              plan_amount: plan,
              realized_amount: 0
            }])
          }

          if (plan !== oldPlan) {
            logRows.push({
              user_id: user.id,
              year,
              brand,
              field_type: 'monthly',
              month: m,
              old_value: oldPlan,
              new_value: plan
            })
          }
        }
      }

      if (logRows.length > 0) {
        await supabase.from('budget_logs').insert(logRows)
      }

      setSuccess('Budget berhasil disimpan' + (logRows.length ? ' (' + logRows.length + ' perubahan dicatat)' : ''))
      setEditMode(false)
      loadData()
    } catch (e) {
      setError(e.message || 'Gagal menyimpan budget')
    }
    setSaving(false)
  }

  // Carry-over logic display: sisa plan bulan lalu + plan bulan ini - realized
  const getMonthAvailable = (brand, month) => {
    const plan = (monthly[brand] && monthly[brand][month]) || 0
    const real = (realized[brand] && realized[brand].byMonth[month]) || 0
    // simple: cumulative plan up to month - cumulative realized up to month
    let cumPlan = 0
    let cumReal = 0
    for (let m = 1; m <= month; m++) {
      cumPlan += (monthly[brand] && monthly[brand][m]) || 0
      cumReal += (realized[brand] && realized[brand].byMonth[m]) || 0
    }
    return cumPlan - cumReal
  }

  const submitShift = async (e) => {
    e.preventDefault()
    setShiftError('')
    setShiftSuccess('')
    const { brand, fromMonth, toMonth, amount } = shiftForm
    if (!brand || !amount) {
      setShiftError('Brand dan nominal wajib diisi')
      return
    }
    const fromM = Number(fromMonth)
    const toM = Number(toMonth)
    if (fromM === toM) {
      setShiftError('Bulan sumber dan tujuan harus berbeda')
      return
    }
    const amt = Number(amount)
    if (amt <= 0) {
      setShiftError('Nominal harus lebih dari 0')
      return
    }
    if (!isAdmin && !allowedBrands.includes(brand)) {
      setShiftError('Tidak berhak untuk brand ini')
      return
    }

    const fromPlan = (monthly[brand] && monthly[brand][fromM]) || 0
    if (amt > fromPlan) {
      setShiftError('Nominal melebihi rencana bulan sumber (' + formatRp(fromPlan) + ')')
      return
    }

    const toPlan = (monthly[brand] && monthly[brand][toM]) || 0
    const newFrom = fromPlan - amt
    const newTo = toPlan + amt

    // Upsert source month
    const { data: exFrom } = await supabase
      .from('monthly_budgets')
      .select('id')
      .eq('year', year)
      .eq('brand', brand)
      .eq('month', fromM)
      .maybeSingle()
    if (exFrom?.id) {
      await supabase.from('monthly_budgets').update({ plan_amount: newFrom }).eq('id', exFrom.id)
    } else {
      await supabase.from('monthly_budgets').insert([{ year, brand, month: fromM, plan_amount: newFrom, realized_amount: 0 }])
    }

    // Upsert target month
    const { data: exTo } = await supabase
      .from('monthly_budgets')
      .select('id')
      .eq('year', year)
      .eq('brand', brand)
      .eq('month', toM)
      .maybeSingle()
    if (exTo?.id) {
      await supabase.from('monthly_budgets').update({ plan_amount: newTo }).eq('id', exTo.id)
    } else {
      await supabase.from('monthly_budgets').insert([{ year, brand, month: toM, plan_amount: newTo, realized_amount: 0 }])
    }

    // Log kedua perubahan
    await supabase.from('budget_logs').insert([
      {
        user_id: user.id,
        year,
        brand,
        field_type: 'monthly',
        month: fromM,
        old_value: fromPlan,
        new_value: newFrom
      },
      {
        user_id: user.id,
        year,
        brand,
        field_type: 'monthly',
        month: toM,
        old_value: toPlan,
        new_value: newTo
      }
    ])

    setShiftSuccess(
      'Berhasil geser ' + formatRp(amt) + ' dari ' + MONTHS[fromM - 1] + ' ke ' + MONTHS[toM - 1]
    )
    setShiftForm({ brand: allowedBrands[0] || '', fromMonth: 1, toMonth: 2, amount: '' })
    setShowShift(false)
    loadData()
  }

  const submitAddendum = async (e) => {
    e.preventDefault()
    setAdError('')
    setAdSuccess('')
    if (!adForm.brand || !adForm.amount) {
      setAdError('Brand dan nominal wajib diisi')
      return
    }
    const amount = Number(adForm.amount)
    if (amount <= 0) {
      setAdError('Nominal harus lebih dari 0')
      return
    }
    if (!isAdmin && !allowedBrands.includes(adForm.brand)) {
      setAdError('Tidak berhak mengajukan untuk brand ini')
      return
    }
    const requiredLevel = getRequiredLevel(amount)
    const { error } = await supabase.from('addendums').insert([{
      brand: adForm.brand,
      year,
      amount,
      reason: adForm.reason.trim() || null,
      status: 'Menunggu Approval',
      current_level: 0,
      required_level: requiredLevel,
      created_by: user.id
    }])
    if (error) {
      setAdError(error.message || 'Gagal mengajukan addendum')
      return
    }
    setAdSuccess('Addendum berhasil diajukan dan menunggu approval')
    setAdForm({ brand: allowedBrands[0] || '', amount: '', reason: '' })
    setShowAddendumForm(false)
    loadData()
  }

  const totalPlan = (brand) => {
    let t = 0
    for (let m = 1; m <= 12; m++) t += (monthly[brand] && monthly[brand][m]) || 0
    return t
  }

  const exportBudgetCsv = () => {
    const esc = (v) => {
      const s = v == null ? '' : String(v)
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }
    const lines = []
    lines.push(['Tahun', 'Brand', 'Alokasi Tahun', 'Total Rencana', 'Realisasi', 'Sisa'].join(','))
    allowedBrands.forEach(brand => {
      const alloc = brandAlloc[brand] || 0
      const plan = totalPlan(brand)
      const real = (realized[brand] && realized[brand].total) || 0
      lines.push([year, brand, alloc, plan, real, alloc - real].map(esc).join(','))
    })
    lines.push('')
    lines.push(['Tahun', 'Brand', 'Bulan', 'Rencana', 'Realisasi', 'Sisa Kumulatif'].join(','))
    allowedBrands.forEach(brand => {
      for (let m = 1; m <= 12; m++) {
        const plan = (monthly[brand] && monthly[brand][m]) || 0
        const real = (realized[brand] && realized[brand].byMonth[m]) || 0
        const avail = getMonthAvailable(brand, m)
        lines.push([year, brand, MONTHS[m - 1], plan, real, avail].map(esc).join(','))
      }
    })
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'budget-' + year + '-' + new Date().toISOString().slice(0, 10) + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.4rem', color: '#1F4E79' }}>Budgeting</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: '#6b7280' }}>Tahun</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={styles.input}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button type="button" onClick={exportBudgetCsv} style={styles.secondaryBtn}>
            Export Excel (CSV)
          </button>
          {isAdmin && (
            <button onClick={() => setShowLogs(!showLogs)} style={styles.secondaryBtn}>
              {showLogs ? 'Tutup Log' : 'Lihat Log'}
            </button>
          )}
          {canEdit && !editMode && (
            <button onClick={() => setEditMode(true)} style={styles.primaryBtn}>Edit Budget</button>
          )}
          {canEdit && editMode && (
            <>
              <button onClick={saveBudget} disabled={saving} style={styles.primaryBtn}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => { setEditMode(false); loadData() }} style={styles.secondaryBtn}>Batal</button>
            </>
          )}
        </div>
      </div>

      {success && <div style={styles.success}>{success}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {showLogs && isAdmin && (
        <div style={styles.card}>
          <h3 style={{ color: '#1F4E79', marginBottom: '1rem' }}>Log Perubahan Budget ({year})</h3>
          {logs.length === 0 ? (
            <p style={{ color: '#6b7280' }}>Belum ada perubahan tercatat.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Waktu</th>
                    <th style={{ ...styles.th, textAlign: 'left' }}>User</th>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Brand</th>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Field</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Nilai Lama</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Nilai Baru</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.filter(l => allowedBrands.includes(l.brand) || isAdmin).map(l => (
                    <tr key={l.id}>
                      <td style={{ ...styles.td, textAlign: 'left', fontSize: '0.8rem' }}>
                        {l.created_at ? new Date(l.created_at).toLocaleString('id-ID') : '-'}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'left' }}>{l.user_name || '-'}</td>
                      <td style={{ ...styles.td, textAlign: 'left' }}>{l.brand}</td>
                      <td style={{ ...styles.td, textAlign: 'left' }}>
                        {l.field_type === 'allocation' ? 'Alokasi Tahun' : 'Rencana ' + (MONTHS[(l.month || 1) - 1] || '')}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>{formatRp(l.old_value)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>{formatRp(l.new_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Addendum section */}
      {canEdit && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ color: '#1F4E79' }}>Addendum Budget</h3>
            <button
              type="button"
              onClick={() => {
                setShowAddendumForm(!showAddendumForm)
                setAdForm({ brand: allowedBrands[0] || '', amount: '', reason: '' })
                setAdError('')
                setAdSuccess('')
              }}
              style={styles.primaryBtn}
            >
              {showAddendumForm ? 'Tutup' : '+ Ajukan Addendum'}
            </button>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            Gunakan addendum jika sisa budget tidak cukup. Setelah di-approve, alokasi tahunan brand akan bertambah.
          </p>
          {adSuccess && <div style={styles.success}>{adSuccess}</div>}
          {adError && <div style={styles.error}>{adError}</div>}
          {showAddendumForm && (
            <form onSubmit={submitAddendum} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>Brand *</label>
                  <select
                    value={adForm.brand}
                    onChange={e => setAdForm(prev => ({ ...prev, brand: e.target.value }))}
                    style={{ ...styles.input, width: '100%', marginTop: '0.25rem' }}
                    required
                  >
                    <option value="">Pilih Brand</option>
                    {allowedBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>Nominal Tambahan (Rp) *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: '#1F4E79' }}>Rp</span>
                    <input
                      value={adForm.amount ? Number(adForm.amount).toLocaleString('id-ID') : ''}
                      onChange={e => setAdForm(prev => ({ ...prev, amount: e.target.value.replace(/\D/g, '') }))}
                      style={{ ...styles.input, flex: 1 }}
                      required
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>Alasan</label>
                <textarea
                  value={adForm.reason}
                  onChange={e => setAdForm(prev => ({ ...prev, reason: e.target.value }))}
                  style={{ ...styles.input, width: '100%', minHeight: '60px', marginTop: '0.25rem' }}
                  placeholder="Kenapa butuh tambahan budget?"
                />
              </div>
              {adForm.amount && (
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Level Approval: <strong>Level {getRequiredLevel(adForm.amount)}</strong>
                </p>
              )}
              <button type="submit" style={{ ...styles.primaryBtn, marginTop: '0.75rem' }}>Kirim Addendum</button>
            </form>
          )}
          {addendums.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Belum ada pengajuan addendum.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Tanggal</th>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Brand</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Nominal</th>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Level</th>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Status</th>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {addendums.map(a => (
                    <tr key={a.id}>
                      <td style={{ ...styles.td, textAlign: 'left', fontSize: '0.8rem' }}>
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'left' }}>{a.brand}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>{formatRp(a.amount)}</td>
                      <td style={{ ...styles.td, textAlign: 'left' }}>L{a.required_level}</td>
                      <td style={{ ...styles.td, textAlign: 'left' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: a.status === 'Approved' ? '#d1fae5' : a.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                          color: a.status === 'Approved' ? '#065f46' : a.status === 'Rejected' ? '#991b1b' : '#92400e'
                        }}>{a.status}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'left', fontSize: '0.8rem', color: '#6b7280' }}>
                        {(a.reason || '-').slice(0, 60)}{(a.reason || '').length > 60 ? '...' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Geser antar bulan */}
      {canEdit && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ color: '#1F4E79' }}>Geser Budget Antar Bulan</h3>
            <button
              type="button"
              onClick={() => {
                setShowShift(!showShift)
                setShiftForm({ brand: allowedBrands[0] || '', fromMonth: 1, toMonth: 2, amount: '' })
                setShiftError('')
                setShiftSuccess('')
              }}
              style={styles.secondaryBtn}
            >
              {showShift ? 'Tutup' : 'Geser Budget'}
            </button>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            Pindahkan rencana dari satu bulan ke bulan lain. Total alokasi tahun tidak berubah.
          </p>
          {shiftSuccess && <div style={styles.success}>{shiftSuccess}</div>}
          {shiftError && <div style={styles.error}>{shiftError}</div>}
          {showShift && (
            <form onSubmit={submitShift}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>Brand *</label>
                  <select
                    value={shiftForm.brand}
                    onChange={e => setShiftForm(prev => ({ ...prev, brand: e.target.value }))}
                    style={{ ...styles.input, width: '100%', marginTop: '0.25rem' }}
                    required
                  >
                    <option value="">Pilih</option>
                    {allowedBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>Dari Bulan *</label>
                  <select
                    value={shiftForm.fromMonth}
                    onChange={e => setShiftForm(prev => ({ ...prev, fromMonth: Number(e.target.value) }))}
                    style={{ ...styles.input, width: '100%', marginTop: '0.25rem' }}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>Ke Bulan *</label>
                  <select
                    value={shiftForm.toMonth}
                    onChange={e => setShiftForm(prev => ({ ...prev, toMonth: Number(e.target.value) }))}
                    style={{ ...styles.input, width: '100%', marginTop: '0.25rem' }}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>Nominal (Rp) *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: '#1F4E79' }}>Rp</span>
                    <input
                      value={shiftForm.amount ? Number(shiftForm.amount).toLocaleString('id-ID') : ''}
                      onChange={e => setShiftForm(prev => ({ ...prev, amount: e.target.value.replace(/\D/g, '') }))}
                      style={{ ...styles.input, flex: 1 }}
                      required
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              {shiftForm.brand && shiftForm.fromMonth && (
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Rencana {MONTHS[shiftForm.fromMonth - 1]} saat ini:{' '}
                  <strong>{formatRp((monthly[shiftForm.brand] && monthly[shiftForm.brand][shiftForm.fromMonth]) || 0)}</strong>
                </p>
              )}
              <button type="submit" style={{ ...styles.primaryBtn, marginTop: '0.75rem' }}>
                Proses Geser
              </button>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <p>Memuat...</p>
      ) : (
        allowedBrands.map(brand => {
          const alloc = brandAlloc[brand] || 0
          const planTotal = totalPlan(brand)
          const realTotal = (realized[brand] && realized[brand].total) || 0
          const sisa = alloc - realTotal
          const planDiff = alloc - planTotal

          return (
            <div key={brand} style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ color: '#1F4E79' }}>{brand}</h3>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                  <div>
                    <div style={styles.statLabel}>Alokasi Tahun</div>
                    {editMode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: '#1F4E79' }}>Rp</span>
                        <input
                          value={alloc ? Number(alloc).toLocaleString('id-ID') : ''}
                          onChange={e => handleAllocChange(brand, e.target.value)}
                          style={{ ...styles.input, width: '130px' }}
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <div style={styles.statValue}>{formatRp(alloc)}</div>
                    )}
                  </div>
                  <div>
                    <div style={styles.statLabel}>Total Rencana Bulanan</div>
                    <div style={{ ...styles.statValue, color: planDiff < 0 ? '#dc2626' : '#1F4E79' }}>
                      {formatRp(planTotal)}
                    </div>
                  </div>
                  <div>
                    <div style={styles.statLabel}>Realisasi (Approved)</div>
                    <div style={styles.statValue}>{formatRp(realTotal)}</div>
                  </div>
                  <div>
                    <div style={styles.statLabel}>Sisa Budget</div>
                    <div style={{ ...styles.statValue, color: sisa < 0 ? '#dc2626' : '#059669' }}>
                      {formatRp(sisa)}
                    </div>
                  </div>
                </div>
              </div>

              {planDiff !== 0 && (
                <p style={{ fontSize: '0.8rem', color: planDiff < 0 ? '#dc2626' : '#6b7280', marginBottom: '0.75rem' }}>
                  {planDiff < 0
                    ? `Peringatan: total rencana bulanan melebihi alokasi tahunan (${formatRp(Math.abs(planDiff))})`
                    : `Sisa alokasi belum dialokasikan ke bulan: ${formatRp(planDiff)}`}
                </p>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Item</th>
                      {MONTHS.map((m, i) => (
                        <th key={i} style={styles.th}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={styles.td}><strong>Rencana</strong></td>
                      {MONTHS.map((_, i) => {
                        const m = i + 1
                        const val = (monthly[brand] && monthly[brand][m]) || 0
                        return (
                          <td key={m} style={styles.td}>
                            {editMode ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Rp</span>
                                <input
                                  value={val ? Number(val).toLocaleString('id-ID') : ''}
                                  onChange={e => handleMonthChange(brand, m, e.target.value)}
                                  style={{ ...styles.input, width: '78px', fontSize: '0.75rem', padding: '0.3rem' }}
                                  placeholder="0"
                                />
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem' }}>{val ? formatRp(val) : '-'}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                    <tr>
                      <td style={styles.td}><strong>Realisasi</strong></td>
                      {MONTHS.map((_, i) => {
                        const m = i + 1
                        const val = (realized[brand] && realized[brand].byMonth[m]) || 0
                        return (
                          <td key={m} style={{ ...styles.td, fontSize: '0.8rem', color: val < 0 ? '#c2410c' : 'inherit' }}>
                            {val ? formatRp(val) : '-'}
                          </td>
                        )
                      })}
                    </tr>
                    <tr>
                      <td style={styles.td}><strong>Sisa Kumulatif</strong></td>
                      {MONTHS.map((_, i) => {
                        const m = i + 1
                        const avail = getMonthAvailable(brand, m)
                        return (
                          <td key={m} style={{
                            ...styles.td,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: avail < 0 ? '#dc2626' : '#059669'
                          }}>
                            {formatRp(avail)}
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                Sisa kumulatif = total rencana s/d bulan ini − total realisasi s/d bulan ini (sisa otomatis terbawa ke bulan berikutnya).
                Akhir tahun sisa di-hold sampai budget tahun baru dibuat.
              </p>
            </div>
          )
        })
      )}

      {!loading && allowedBrands.length === 0 && (
        <p style={{ color: '#6b7280' }}>Tidak ada brand yang bisa diakses.</p>
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
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem'
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: {
    textAlign: 'center',
    padding: '0.5rem 0.4rem',
    background: '#1F4E79',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.75rem'
  },
  td: { padding: '0.45rem 0.4rem', borderBottom: '1px solid #e5e7eb', textAlign: 'center' },
  statLabel: { fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.2rem' },
  statValue: { fontSize: '1.05rem', fontWeight: 700, color: '#1F4E79' },
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
