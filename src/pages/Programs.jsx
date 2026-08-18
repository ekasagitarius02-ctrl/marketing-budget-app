import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const BRANDS = ['Herbacare', 'Madu', 'Jelly']

function formatRp(num) {
  if (num == null || num === '') return '-'
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

function shortId(id) {
  if (!id) return '-'
  return String(id).slice(0, 8).toUpperCase()
}

export default function Programs({ user }) {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [reversalOf, setReversalOf] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [detailProgram, setDetailProgram] = useState(null)
  const [detailLogs, setDetailLogs] = useState([])
  const [detailUsers, setDetailUsers] = useState({})
  const [form, setForm] = useState({
    brand: '',
    name: '',
    description: '',
    budget_amount: '',
    period_start: '',
    period_end: '',
    no_pap: '',
    outlet: '',
    distributor: '',
    region: '',
    area: '',
    tujuan: '',
    mekanisme: '',
    biaya_program: '',
    ppn: '',
    biaya_mailer: '',
    biaya_vendor: '',
    estimasi_omzet: ''
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

  const handleMoneyChange = (e) => {
    const { name, value } = e.target
    const raw = String(value).replace(/\D/g, '')
    setForm(prev => ({ ...prev, [name]: raw }))
  }

  const resetForm = () => {
    setForm({
      brand: allowedBrands[0] || '',
      name: '',
      description: '',
      budget_amount: '',
      period_start: '',
      period_end: '',
      no_pap: '',
      outlet: '',
      distributor: '',
      region: '',
      area: '',
      tujuan: '',
      mekanisme: '',
      biaya_program: '',
      ppn: '',
      biaya_mailer: '',
      biaya_vendor: '',
      estimasi_omzet: ''
    })
    setShowForm(false)
    setEditingId(null)
    setReversalOf(null)
    setError('')
  }

  const openCreate = () => {
    setEditingId(null)
    setReversalOf(null)
    setForm({
      brand: allowedBrands[0] || '',
      name: '',
      description: '',
      budget_amount: '',
      period_start: '',
      period_end: '',
      no_pap: '',
      outlet: '',
      distributor: '',
      region: '',
      area: '',
      tujuan: '',
      mekanisme: '',
      biaya_program: '',
      ppn: '',
      biaya_mailer: '',
      biaya_vendor: '',
      estimasi_omzet: ''
    })
    setShowForm(true)
    setSuccess('')
    setError('')
  }

  const startEdit = (p) => {
    if (p.status !== 'Draft' && p.status !== 'Revisi') {
      setError('Hanya program berstatus Draft atau Revisi yang bisa diedit')
      return
    }
    setEditingId(p.id)
    setReversalOf(null)
    setForm({
      brand: p.brand,
      name: p.name,
      description: p.description || '',
      budget_amount: String(Math.abs(p.budget_amount || 0)),
      period_start: p.period_start || '',
      period_end: p.period_end || '',
      no_pap: p.no_pap || '',
      outlet: p.outlet || '',
      distributor: p.distributor || '',
      region: p.region || '',
      area: p.area || '',
      tujuan: p.tujuan || '',
      mekanisme: p.mekanisme || '',
      biaya_program: p.biaya_program ? String(p.biaya_program) : '',
      ppn: p.ppn ? String(p.ppn) : '',
      biaya_mailer: p.biaya_mailer ? String(p.biaya_mailer) : '',
      biaya_vendor: p.biaya_vendor ? String(p.biaya_vendor) : '',
      estimasi_omzet: p.estimasi_omzet ? String(p.estimasi_omzet) : ''
    })
    setShowForm(true)
    setSuccess('')
    setError('')
  }

  const startReversal = (p) => {
    setEditingId(null)
    setReversalOf(p)
    setForm({
      brand: p.brand,
      name: 'PEMBALIK - ' + p.name,
      description: 'Pembalik dari program No. ' + shortId(p.id) + ' — ' + p.name,
      budget_amount: String(Math.abs(p.budget_amount || 0)),
      period_start: p.period_start || '',
      period_end: p.period_end || '',
      no_pap: p.no_pap || '',
      outlet: p.outlet || '',
      distributor: p.distributor || '',
      region: p.region || '',
      area: p.area || '',
      tujuan: p.tujuan || '',
      mekanisme: p.mekanisme || '',
      biaya_program: p.biaya_program ? String(Math.abs(p.biaya_program)) : '',
      ppn: p.ppn ? String(Math.abs(p.ppn)) : '',
      biaya_mailer: p.biaya_mailer ? String(Math.abs(p.biaya_mailer)) : '',
      biaya_vendor: p.biaya_vendor ? String(Math.abs(p.biaya_vendor)) : '',
      estimasi_omzet: p.estimasi_omzet ? String(p.estimasi_omzet) : ''
    })
    setShowForm(true)
    setSuccess('')
    setError('')
  }

  const deleteProgram = async (p) => {
    if (!isAdmin) return
    const ok = window.confirm('Hapus program "' + p.name + '"?\nTindakan ini tidak bisa dibatalkan.')
    if (!ok) return
    setError('')
    setSuccess('')
    const { error } = await supabase.from('programs').delete().eq('id', p.id)
    if (error) {
      setError(error.message || 'Gagal menghapus program')
      return
    }
    setSuccess('Program berhasil dihapus')
    loadPrograms()
  }

  const saveProgram = async (asDraft) => {
    setError('')
    setSuccess('')

    if (!form.brand || !form.name.trim() || !form.budget_amount) {
      setError('Brand, Nama Program, dan Estimasi Dana wajib diisi')
      return
    }

    let amount = Number(form.budget_amount)
    if (amount <= 0) {
      setError('Estimasi Dana harus lebih dari 0')
      return
    }

    if (reversalOf) {
      amount = -Math.abs(amount)
    }

    if (!isAdmin && !allowedBrands.includes(form.brand)) {
      setError('Anda tidak berhak membuat program untuk brand ini')
      return
    }

    const requiredLevel = reversalOf ? 1 : getRequiredLevel(amount)

    if (editingId) {
      const payload = {
        brand: form.brand,
        name: form.name.trim(),
        description: form.description.trim() || null,
        budget_amount: amount,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        no_pap: form.no_pap.trim() || null,
        outlet: form.outlet.trim() || null,
        distributor: form.distributor.trim() || null,
        region: form.region.trim() || null,
        area: form.area.trim() || null,
        tujuan: form.tujuan.trim() || null,
        mekanisme: form.mekanisme.trim() || null,
        biaya_program: form.biaya_program ? Number(form.biaya_program) : 0,
        ppn: form.ppn ? Number(form.ppn) : 0,
        biaya_mailer: form.biaya_mailer ? Number(form.biaya_mailer) : 0,
        biaya_vendor: form.biaya_vendor ? Number(form.biaya_vendor) : 0,
        estimasi_omzet: form.estimasi_omzet ? Number(form.estimasi_omzet) : 0,
        status: asDraft ? 'Draft' : 'Menunggu Approval',
        current_level: 0,
        required_level: requiredLevel,
        updated_at: new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('programs')
        .update(payload)
        .eq('id', editingId)

      if (updateError) {
        setError(updateError.message || 'Gagal mengubah program')
        return
      }
      setSuccess(asDraft ? 'Draft berhasil disimpan' : 'Program berhasil diajukan untuk approval')
    } else {
      let desc = form.description.trim() || null
      if (reversalOf) {
        desc = (desc || '') + ' [REF:' + reversalOf.id + ']'
      }

      const payload = {
        brand: form.brand,
        name: form.name.trim(),
        description: desc,
        budget_amount: amount,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        no_pap: form.no_pap.trim() || null,
        outlet: form.outlet.trim() || null,
        distributor: form.distributor.trim() || null,
        region: form.region.trim() || null,
        area: form.area.trim() || null,
        tujuan: form.tujuan.trim() || null,
        mekanisme: form.mekanisme.trim() || null,
        biaya_program: form.biaya_program ? Number(form.biaya_program) : 0,
        ppn: form.ppn ? Number(form.ppn) : 0,
        biaya_mailer: form.biaya_mailer ? Number(form.biaya_mailer) : 0,
        biaya_vendor: form.biaya_vendor ? Number(form.biaya_vendor) : 0,
        estimasi_omzet: form.estimasi_omzet ? Number(form.estimasi_omzet) : 0,
        status: asDraft ? 'Draft' : 'Menunggu Approval',
        current_level: 0,
        required_level: requiredLevel,
        created_by: user.id
      }

      const { error: insertError } = await supabase.from('programs').insert([payload])

      if (insertError) {
        setError(insertError.message || 'Gagal menyimpan program')
        return
      }
      setSuccess(
        reversalOf
          ? 'Program pembalik berhasil diajukan (approval Level 1)'
          : (asDraft ? 'Draft berhasil disimpan' : 'Program berhasil diajukan untuk approval')
      )
    }

    resetForm()
    loadPrograms()
  }

  const openDetail = async (p) => {
    setDetailProgram(p)
    setDetailLogs([])
    const { data: logData } = await supabase
      .from('approval_logs')
      .select('*')
      .eq('program_id', p.id)
      .order('created_at', { ascending: true })
    const logs = logData || []
    setDetailLogs(logs)
    const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))]
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, username')
        .in('id', userIds)
      const map = {}
      ;(usersData || []).forEach(u => { map[u.id] = u })
      setDetailUsers(map)
    } else {
      setDetailUsers({})
    }
  }

  const exportProgramsCsv = () => {
    const rows = filtered.length ? filtered : programs
    if (!rows.length) {
      alert('Tidak ada data program untuk diexport')
      return
    }
    const headers = [
      'No', 'Tanggal', 'Brand', 'Nama Program', 'Estimasi Dana', 'Status',
      'Level', 'No PAP', 'Outlet', 'Distributor', 'Region', 'Area', 'Periode Mulai', 'Periode Selesai', 'Keterangan'
    ]
    const esc = (v) => {
      const s = v == null ? '' : String(v)
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }
    const lines = [headers.join(',')]
    rows.forEach(p => {
      lines.push([
        shortId(p.id),
        p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : '',
        p.brand,
        p.name,
        p.budget_amount,
        p.status,
        p.required_level,
        p.no_pap || '',
        p.outlet || '',
        p.distributor || '',
        p.region || '',
        p.area || '',
        p.period_start || '',
        p.period_end || '',
        (p.description || '').replace(/\[REF:[^\]]+\]/g, '').replace(/\n/g, ' ').trim()
      ].map(esc).join(','))
    })
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'programs-export-' + new Date().toISOString().slice(0, 10) + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const printProgram = (p, logs, usersMap) => {
    const desc = (p.description || '').replace(/\[REF:[^\]]+\]/g, '').trim()
    const isNeg = Number(p.budget_amount) < 0
    const refMatch = (p.description || '').match(/\[REF:([^\]]+)\]/)
    const refId = refMatch ? refMatch[1] : null
    const tgl = p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'
    const periode = [p.period_start, p.period_end].filter(Boolean).map(d => new Date(d).toLocaleDateString('id-ID')).join(' s/d ') || '-'

    let approvalRows = ''
    if (logs && logs.length > 0) {
      approvalRows = logs.map(l => {
        const u = usersMap && usersMap[l.user_id]
        const name = u ? (u.full_name || u.username) : '-'
        const t = l.created_at ? new Date(l.created_at).toLocaleString('id-ID') : '-'
        return '<tr><td style="padding:6px 8px;border:1px solid #333;">L' + l.level + '</td><td style="padding:6px 8px;border:1px solid #333;">' + name + '</td><td style="padding:6px 8px;border:1px solid #333;">' + l.action + '</td><td style="padding:6px 8px;border:1px solid #333;">' + t + '</td><td style="padding:6px 8px;border:1px solid #333;">' + (l.notes || '-') + '</td></tr>'
      }).join('')
    } else {
      approvalRows = '<tr><td colspan="5" style="padding:8px;border:1px solid #333;text-align:center;">Belum ada riwayat approval</td></tr>'
    }

    const biayaProg = Number(p.biaya_program) || 0
    const biayaPpn = Number(p.ppn) || 0
    const biayaMailer = Number(p.biaya_mailer) || 0
    const biayaVendor = Number(p.biaya_vendor) || 0
    const omzet = Number(p.estimasi_omzet) || 0
    const grandBreakdown = biayaProg + biayaPpn + biayaMailer + biayaVendor
    const costRatio = omzet > 0 ? ((Number(p.budget_amount) || grandBreakdown) / omzet * 100).toFixed(1) + '%' : '-'

    // Build signature cells from approval logs (latest approve per level)
    const approveByLevel = {}
    ;(logs || []).filter(l => l.action === 'Approve').forEach(l => {
      const u = usersMap && usersMap[l.user_id]
      approveByLevel[l.level] = u ? (u.full_name || u.username) : '-'
    })

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Proposal - ${p.name}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111; line-height: 1.4; }
    h1 { text-align: center; font-size: 16pt; margin: 0 0 4px; letter-spacing: 1px; }
    .sub { text-align: center; font-size: 10pt; color: #444; margin-bottom: 16px; }
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    table.info td { padding: 4px 6px; vertical-align: top; }
    table.info td.label { width: 140px; font-weight: bold; }
    table.info td.sep { width: 12px; }
    .box { border: 1.5px solid #222; padding: 10px 12px; margin-bottom: 14px; }
    .box h3 { margin: 0 0 6px; font-size: 11pt; text-transform: uppercase; }
    .box ul { margin: 0; padding-left: 18px; }
    table.grid { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10pt; }
    table.grid th, table.grid td { border: 1px solid #333; padding: 6px 8px; }
    table.grid th { background: #e8eef5; text-align: left; }
    .total { font-size: 12pt; font-weight: bold; margin: 8px 0; }
    .footer { margin-top: 24px; font-size: 9pt; color: #666; text-align: center; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div style="text-align:center;font-size:12pt;font-weight:bold;letter-spacing:2px;">MT</div>
  <h1>PROPOSAL AKTIVITAS PROMOSI</h1>
  <div class="sub">Marketing Budget System</div>

  <table class="info">
    <tr>
      <td class="label">No. Program</td><td class="sep">:</td><td>${shortId(p.id)}</td>
      <td class="label">Tanggal Pengajuan</td><td class="sep">:</td><td>${tgl}</td>
    </tr>
    <tr>
      <td class="label">No. PAP</td><td class="sep">:</td><td>${p.no_pap || '-'}</td>
      <td class="label">Status</td><td class="sep">:</td><td><strong>${p.status || '-'}</strong></td>
    </tr>
    <tr>
      <td class="label">Brand</td><td class="sep">:</td><td>${p.brand || '-'}</td>
      <td class="label">Level Approval</td><td class="sep">:</td><td>Level ${p.required_level || '-'}</td>
    </tr>
    <tr>
      <td class="label">Nama Program</td><td class="sep">:</td><td colspan="4"><strong>${(p.name || '').replace(/</g,'&lt;')}</strong>${isNeg ? ' <span style="color:#c2410c">[PEMBALIK]</span>' : ''}</td>
    </tr>
    <tr>
      <td class="label">Outlet</td><td class="sep">:</td><td>${p.outlet || '-'}</td>
      <td class="label">Distributor</td><td class="sep">:</td><td>${p.distributor || '-'}</td>
    </tr>
    <tr>
      <td class="label">Region</td><td class="sep">:</td><td>${p.region || '-'}</td>
      <td class="label">Area / Depo</td><td class="sep">:</td><td>${p.area || '-'}</td>
    </tr>
    <tr>
      <td class="label">Periode</td><td class="sep">:</td><td colspan="4">${periode}</td>
    </tr>
    ${refId ? '<tr><td class="label">No. Referensi</td><td class="sep">:</td><td colspan="4">' + shortId(refId) + ' (Program Pembalik)</td></tr>' : ''}
  </table>

  <div class="box">
    <h3>Keterangan Kegiatan</h3>
    <div>${desc ? desc.replace(/\n/g, '<br/>').replace(/</g,'&lt;') : '<em>Tidak ada keterangan</em>'}</div>
  </div>

  ${(p.tujuan || '').trim() ? '<div class="box"><h3>Tujuan</h3><div>' + String(p.tujuan).replace(/\n/g,'<br/>').replace(/</g,'&lt;') + '</div></div>' : ''}
  ${(p.mekanisme || '').trim() ? '<div class="box"><h3>Mekanisme</h3><div>' + String(p.mekanisme).replace(/\n/g,'<br/>').replace(/</g,'&lt;') + '</div></div>' : ''}

  <div class="box">
    <h3>Estimasi Budget</h3>
    <table class="info" style="margin:0">
      <tr><td class="label">Biaya Program</td><td class="sep">:</td><td>${formatRp(biayaProg)}</td></tr>
      <tr><td class="label">PPN</td><td class="sep">:</td><td>${formatRp(biayaPpn)}</td></tr>
      <tr><td class="label">Biaya Mailer</td><td class="sep">:</td><td>${formatRp(biayaMailer)}</td></tr>
      <tr><td class="label">Biaya Vendor</td><td class="sep">:</td><td>${formatRp(biayaVendor)}</td></tr>
      <tr><td class="label">Subtotal Breakdown</td><td class="sep">:</td><td>${formatRp(grandBreakdown)}</td></tr>
      <tr><td class="label">Estimasi Omzet</td><td class="sep">:</td><td>${formatRp(omzet)}</td></tr>
      <tr><td class="label">Cost Ratio</td><td class="sep">:</td><td>${costRatio}</td></tr>
    </table>
    <div class="total" style="margin-top:8px">GRAND TOTAL (Approval) : ${formatRp(p.budget_amount)}</div>
  </div>

  <h3 style="margin:0 0 6px;font-size:11pt;">RIWAYAT APPROVAL</h3>
  <table class="grid">
    <thead>
      <tr>
        <th>Level</th>
        <th>Nama</th>
        <th>Aksi</th>
        <th>Waktu</th>
        <th>Catatan</th>
      </tr>
    </thead>
    <tbody>
      ${approvalRows}
    </tbody>
  </table>

  <h3 style="margin:18px 0 6px;font-size:11pt;">PERSETUJUAN</h3>
  <table class="grid" style="margin-bottom:8px;">
    <thead>
      <tr>
        <th style="text-align:center;width:14%">L1</th>
        <th style="text-align:center;width:14%">L2</th>
        <th style="text-align:center;width:14%">L3</th>
        <th style="text-align:center;width:14%">L4</th>
        <th style="text-align:center;width:14%">L5</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="height:50px;text-align:center;vertical-align:bottom;font-size:9pt;">${approveByLevel[1] || ''}</td>
        <td style="height:50px;text-align:center;vertical-align:bottom;font-size:9pt;">${approveByLevel[2] || ''}</td>
        <td style="height:50px;text-align:center;vertical-align:bottom;font-size:9pt;">${approveByLevel[3] || ''}</td>
        <td style="height:50px;text-align:center;vertical-align:bottom;font-size:9pt;">${approveByLevel[4] || ''}</td>
        <td style="height:50px;text-align:center;vertical-align:bottom;font-size:9pt;">${approveByLevel[5] || ''}</td>
      </tr>
      <tr>
        <td style="text-align:center;font-size:8pt;color:#666;">Approver L1</td>
        <td style="text-align:center;font-size:8pt;color:#666;">Approver L2</td>
        <td style="text-align:center;font-size:8pt;color:#666;">Approver L3</td>
        <td style="text-align:center;font-size:8pt;color:#666;">Approver L4</td>
        <td style="text-align:center;font-size:8pt;color:#666;">Approver L5</td>
      </tr>
    </tbody>
  </table>
  <p style="font-size:8pt;color:#666;margin:0 0 12px;">Nama terisi otomatis dari riwayat approval yang sudah Approve.</p>

  <div class="footer">
    Dicetak dari Marketing Budget System · ${new Date().toLocaleString('id-ID')} · Status: ${p.status || '-'}
  </div>

  <div class="no-print" style="margin-top:20px;text-align:center;">
    <button onclick="window.print()" style="padding:10px 24px;font-size:14px;cursor:pointer;background:#1F4E79;color:#fff;border:none;border-radius:6px;">Cetak / Simpan PDF</button>
    <button onclick="window.close()" style="padding:10px 24px;font-size:14px;cursor:pointer;margin-left:8px;">Tutup</button>
  </div>
</body>
</html>`

    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) {
      alert('Popup diblokir. Izinkan popup untuk situs ini, lalu coba lagi.')
      return
    }
    w.document.write(html)
    w.document.close()
  }


  const handleSubmit = (e) => {
    e.preventDefault()
    saveProgram(false)
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

  const isReversalForm = !!reversalOf

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.4rem', color: '#1F4E79' }}>Program Tracker</h1>
        {canCreate && (
          <button
            onClick={() => {
              if (showForm) resetForm()
              else openCreate()
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
          <h3 style={{ marginBottom: '1rem', color: '#1F4E79' }}>
            {editingId
              ? 'Edit Draft Program'
              : isReversalForm
                ? 'Buat Pembalik (Ref: ' + shortId(reversalOf.id) + ')'
                : 'Buat Pengajuan Program'}
          </h3>

          {isReversalForm && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Pembalik dari: <strong>{reversalOf.name}</strong> ({formatRp(reversalOf.budget_amount)})
              <br />
              Nominal akan disimpan sebagai <strong>negatif</strong>. Approval cukup Level 1.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Brand *</label>
                <select
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  style={{ ...styles.input, background: isReversalForm ? '#f3f4f6' : 'white' }}
                  required
                  disabled={isReversalForm}
                >
                  <option value="">Pilih Brand</option>
                  {allowedBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Nama Program *</label>
                <input name="name" value={form.name} onChange={handleChange} style={styles.input} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>
                  Estimasi Dana (Rp) * {isReversalForm && <span style={{ color: '#c2410c' }}>(akan negatif)</span>}
                </label>
                <input
                  value={form.budget_amount ? Number(form.budget_amount).toLocaleString('id-ID') : ''}
                  onChange={handleBudgetChange}
                  style={styles.input}
                  required
                  disabled={isReversalForm}
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
                style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }}
              />
            </div>

            <h4 style={{ margin: '1.25rem 0 0.75rem', color: '#1F4E79', fontSize: '0.95rem' }}>Informasi Proposal (opsional)</h4>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>No. PAP</label>
                <input name="no_pap" value={form.no_pap} onChange={handleChange} style={styles.input} placeholder="Contoh: 152/MTI/JAWA/..." />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Nama Outlet</label>
                <input name="outlet" value={form.outlet} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Nama Distributor</label>
                <input name="distributor" value={form.distributor} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Region</label>
                <input name="region" value={form.region} onChange={handleChange} style={styles.input} placeholder="Contoh: JABODETABEK" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Area / Depo</label>
                <input name="area" value={form.area} onChange={handleChange} style={styles.input} />
              </div>
            </div>

            <div style={{ ...styles.field, marginTop: '1rem' }}>
              <label style={styles.label}>Tujuan</label>
              <textarea name="tujuan" value={form.tujuan} onChange={handleChange} style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }} placeholder="Satu baris per tujuan, atau paragraf" />
            </div>
            <div style={{ ...styles.field, marginTop: '0.75rem' }}>
              <label style={styles.label}>Mekanisme</label>
              <textarea name="mekanisme" value={form.mekanisme} onChange={handleChange} style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }} placeholder="Cara kerja / aturan biaya program" />
            </div>

            <h4 style={{ margin: '1.25rem 0 0.75rem', color: '#1F4E79', fontSize: '0.95rem' }}>Breakdown Budget (opsional)</h4>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Biaya Program (Rp)</label>
                <input name="biaya_program" value={form.biaya_program ? Number(form.biaya_program).toLocaleString('id-ID') : ''} onChange={handleMoneyChange} style={styles.input} placeholder="0" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>PPN (Rp)</label>
                <input name="ppn" value={form.ppn ? Number(form.ppn).toLocaleString('id-ID') : ''} onChange={handleMoneyChange} style={styles.input} placeholder="0" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Biaya Mailer (Rp)</label>
                <input name="biaya_mailer" value={form.biaya_mailer ? Number(form.biaya_mailer).toLocaleString('id-ID') : ''} onChange={handleMoneyChange} style={styles.input} placeholder="0" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Biaya Vendor (Rp)</label>
                <input name="biaya_vendor" value={form.biaya_vendor ? Number(form.biaya_vendor).toLocaleString('id-ID') : ''} onChange={handleMoneyChange} style={styles.input} placeholder="0" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Estimasi Omzet (Rp)</label>
                <input name="estimasi_omzet" value={form.estimasi_omzet ? Number(form.estimasi_omzet).toLocaleString('id-ID') : ''} onChange={handleMoneyChange} style={styles.input} placeholder="0" />
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              Estimasi Dana di atas tetap dipakai untuk approval. Breakdown ini untuk detail cetak/proposal.
            </p>

            {form.budget_amount && !isReversalForm && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
                Level Approval: <strong>Level {getRequiredLevel(form.budget_amount)}</strong>
              </p>
            )}
            {isReversalForm && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#c2410c' }}>
                Level Approval Pembalik: <strong>Level 1</strong>
              </p>
            )}
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {!isReversalForm && (
                <button type="button" onClick={() => saveProgram(true)} style={styles.secondaryBtn}>
                  Simpan Draft
                </button>
              )}
              <button type="submit" style={styles.primaryBtn}>
                {isReversalForm ? 'Kirim Pembalik (Level 1)' : 'Kirim untuk Approval'}
              </button>
              {(editingId || isReversalForm) && (
                <button type="button" onClick={resetForm} style={styles.secondaryBtn}>Batal</button>
              )}
            </div>
          </form>
        </div>
      )}

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ color: '#1F4E79' }}>Daftar Program</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={exportProgramsCsv} style={styles.secondaryBtn}>Export Excel (CSV)</button>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...styles.input, width: 'auto' }}>
            <option value="Semua">Semua Status</option>
            <option value="Draft">Draft</option>
            <option value="Menunggu Approval">Menunggu Approval</option>
            <option value="Revisi">Revisi</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          </div>
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
                  <th style={styles.th}>No / Ref</th>
                  <th style={styles.th}>Tanggal</th>
                  <th style={styles.th}>Brand</th>
                  <th style={styles.th}>Nama Program</th>
                  <th style={styles.th}>Estimasi Dana</th>
                  <th style={styles.th}>Level</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const sc = statusColor(p.status)
                  const isNeg = Number(p.budget_amount) < 0
                  const refMatch = (p.description || '').match(/\[REF:([^\]]+)\]/)
                  const refId = refMatch ? refMatch[1] : null
                  return (
                    <tr key={p.id} style={isNeg ? { background: '#fff7ed' } : {}}>
                      <td style={styles.td}>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{shortId(p.id)}</div>
                        {refId && (
                          <div style={{ fontSize: '0.75rem', color: '#c2410c' }}>
                            Ref: {shortId(refId)}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>{p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : '-'}</td>
                      <td style={styles.td}>{p.brand}</td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600 }}>
                          {isNeg && <span style={{ color: '#c2410c', marginRight: '0.35rem' }}>[PEMBALIK]</span>}
                          {p.name}
                        </div>
                        {p.description && (
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
                            {(p.description.replace(/\[REF:[^\]]+\]/, '').trim()).slice(0, 50)}
                            {(p.description.replace(/\[REF:[^\]]+\]/, '').trim()).length > 50 ? '...' : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ ...styles.td, color: isNeg ? '#c2410c' : 'inherit', fontWeight: isNeg ? 600 : 400 }}>
                        {formatRp(p.budget_amount)}
                      </td>
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
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button onClick={() => openDetail(p)} style={styles.smallBtn}>Detail</button>
                          <button onClick={async () => {
                            const { data: logData } = await supabase.from('approval_logs').select('*').eq('program_id', p.id).order('created_at', { ascending: true })
                            const logs = logData || []
                            const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))]
                            let map = {}
                            if (userIds.length > 0) {
                              const { data: usersData } = await supabase.from('users').select('id, full_name, username').in('id', userIds)
                              ;(usersData || []).forEach(u => { map[u.id] = u })
                            }
                            printProgram(p, logs, map)
                          }} style={styles.smallBtn}>Cetak</button>
                          {(p.status === 'Draft' || p.status === 'Revisi') && canCreate && (
                            <button onClick={() => startEdit(p)} style={styles.smallBtn}>Edit</button>
                          )}
                          {p.status !== 'Draft' && !isNeg && canCreate && (
                            <button onClick={() => startReversal(p)} style={{ ...styles.smallBtn, color: '#c2410c' }}>
                              Buat Pembalik
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => deleteProgram(p)} style={{ ...styles.smallBtn, color: '#dc2626' }}>
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      {detailProgram && (
        <div style={styles.overlay} onClick={() => setDetailProgram(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#1F4E79', marginBottom: '0.75rem' }}>Detail Program</h3>
            <div style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
              <div><strong>{detailProgram.name}</strong></div>
              <div style={{ color: '#6b7280', marginTop: '0.35rem' }}>
                {detailProgram.brand} · {formatRp(detailProgram.budget_amount)} · {detailProgram.status}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                No: {shortId(detailProgram.id)}
                {detailProgram.no_pap ? ' · PAP: ' + detailProgram.no_pap : ''}
                {' · Level ' + detailProgram.required_level}
                {detailProgram.created_at ? ' · ' + new Date(detailProgram.created_at).toLocaleString('id-ID') : ''}
              </div>
              {(detailProgram.outlet || detailProgram.distributor) && (
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.35rem' }}>
                  {detailProgram.outlet && <span>Outlet: {detailProgram.outlet}</span>}
                  {detailProgram.outlet && detailProgram.distributor && ' · '}
                  {detailProgram.distributor && <span>Distributor: {detailProgram.distributor}</span>}
                </div>
              )}
              {(detailProgram.region || detailProgram.area) && (
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  {[detailProgram.region, detailProgram.area].filter(Boolean).join(' · ')}
                </div>
              )}
              {detailProgram.description && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                  {detailProgram.description.replace(/\[REF:[^\]]+\]/, '').trim()}
                </div>
              )}
              {detailProgram.tujuan && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  <strong>Tujuan:</strong>
                  <div style={{ color: '#6b7280', whiteSpace: 'pre-wrap' }}>{detailProgram.tujuan}</div>
                </div>
              )}
              {detailProgram.mekanisme && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  <strong>Mekanisme:</strong>
                  <div style={{ color: '#6b7280', whiteSpace: 'pre-wrap' }}>{detailProgram.mekanisme}</div>
                </div>
              )}
              {(Number(detailProgram.biaya_program) > 0 || Number(detailProgram.ppn) > 0 || Number(detailProgram.biaya_mailer) > 0 || Number(detailProgram.biaya_vendor) > 0) && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                  Program: {formatRp(detailProgram.biaya_program)} · PPN: {formatRp(detailProgram.ppn)} · Mailer: {formatRp(detailProgram.biaya_mailer)} · Vendor: {formatRp(detailProgram.biaya_vendor)}
                  {Number(detailProgram.estimasi_omzet) > 0 && <span> · Omzet: {formatRp(detailProgram.estimasi_omzet)}</span>}
                </div>
              )}
            </div>
            <h4 style={{ fontSize: '0.9rem', color: '#1F4E79', marginBottom: '0.5rem' }}>Riwayat Approval</h4>
            {detailLogs.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Belum ada approval.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {detailLogs.map(l => {
                  const u = detailUsers[l.user_id]
                  const name = u ? (u.full_name || u.username) : shortId(l.user_id)
                  const actionColor = l.action === 'Approve' ? '#059669' : l.action === 'Reject' ? '#dc2626' : '#d97706'
                  return (
                    <div key={l.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.65rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span><strong>L{l.level}</strong> · {name}</span>
                        <span style={{ color: actionColor, fontWeight: 600 }}>{l.action}</span>
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                        {l.created_at ? new Date(l.created_at).toLocaleString('id-ID') : ''}
                      </div>
                      {l.notes && (
                        <div style={{ color: '#6b7280', marginTop: '0.25rem' }}>Catatan: {l.notes}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => printProgram(detailProgram, detailLogs, detailUsers)}
                style={styles.primaryBtn}
              >
                Cetak / PDF
              </button>
              <button type="button" onClick={() => setDetailProgram(null)} style={styles.secondaryBtn}>Tutup</button>
            </div>
          </div>
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
  secondaryBtn: {
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '0.6rem 1.1rem',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer'
  },
  smallBtn: {
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '0.3rem 0.55rem',
    fontSize: '0.78rem',
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
