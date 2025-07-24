'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import html2canvas from 'html2canvas'
import './tambah.css'
import '../dashboard/dashboard.css'

function Typewriter({ texts, speed = 80, pause = 1400 }) {
  const [display, setDisplay] = useState('')
  const [loop, setLoop] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = texts[loop % texts.length]
    if (!deleting && charIdx < current.length) {
      const timeout = setTimeout(() => setCharIdx(charIdx + 1), speed)
      setDisplay(current.slice(0, charIdx + 1))
      return () => clearTimeout(timeout)
    }
    if (!deleting && charIdx === current.length) {
      const timeout = setTimeout(() => setDeleting(true), pause)
      return () => clearTimeout(timeout)
    }
    if (deleting && charIdx > 0) {
      const timeout = setTimeout(() => setCharIdx(charIdx - 1), speed / 2)
      setDisplay(current.slice(0, charIdx - 1))
      return () => clearTimeout(timeout)
    }
    if (deleting && charIdx === 0) {
      const timeout = setTimeout(() => {
        setDeleting(false)
        setLoop(loop + 1)
      }, 400)
      return () => clearTimeout(timeout)
    }
  }, [charIdx, deleting, loop, texts, speed, pause])

  return <span className="typewriter">{display}<span className="type-cursor" /></span>
}

export default function TambahPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [msg, setMsg] = useState('')
  const [aplikasiList, setAplikasiList] = useState([])
  const [showNota, setShowNota] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    aplikasi_id: '', nomor_telepon: '', jumlah_order: '', durasi_jenis: '', durasi_total: '', harga_beli: '', harga_jual: '', tanggal_mulai: ''
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push('/login')
      setUser(data.session.user)
      const email = data.session.user.email
      const { data: admin } = await supabase.from('admins').select('*').eq('email', email).single()
      if (admin) setProfile(admin)
      const { data: apps } = await supabase.from('aplikasi_premium').select('id, nama_aplikasi').order('nama_aplikasi')
      if (apps) setAplikasiList(apps)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) router.push('/login')
      else setUser(session.user)
    })
    return () => { listener?.subscription?.unsubscribe() }
  }, [router])

  useEffect(() => {
    if (msg) {
      const timeout = setTimeout(() => setMsg(''), 4000)
      return () => clearTimeout(timeout)
    }
  }, [msg])

  const handleChange = e => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  const calculateTanggalSelesai = (mulai, jenis, total) => {
    if (!mulai || !jenis || !total) return null
    const date = new Date(mulai)
    switch (jenis) {
      case 'harian': date.setDate(date.getDate() + total); break
      case 'mingguan': date.setDate(date.getDate() + total * 7); break
      case 'bulanan': date.setMonth(date.getMonth() + total); break
      case 'tahunan': date.setFullYear(date.getFullYear() + total); break
      case 'lifetime': return '2099-12-31'
    }
    return date.toISOString().split('T')[0]
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!user) return
    const tanggal_selesai = calculateTanggalSelesai(form.tanggal_mulai, form.durasi_jenis, parseInt(form.durasi_total))
    const { error } = await supabase.from('penjualan').insert([{
      user_id: user.id,
      aplikasi_id: form.aplikasi_id,
      jumlah_order: parseInt(form.jumlah_order),
      harga_beli: parseInt(form.harga_beli),
      harga_jual: parseInt(form.harga_jual),
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai,
      nomor_telepon: form.nomor_telepon,
      durasi_jenis: form.durasi_jenis,
      durasi_total: parseInt(form.durasi_total)
    }])

    if (error) setMsg('❌ Gagal menyimpan data.')
    else {
      setMsg('✅ Data berhasil disimpan!')
      setShowNota(true)
    }
  }

  const downloadNotaAsImage = () => {
    const notaElement = document.getElementById('nota-print')
    html2canvas(notaElement, {
      backgroundColor: null,
      scale: 3,
      useCORS: true
    }).then(canvas => {
      const link = document.createElement('a')
      link.download = `nota-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    })
  }

  const goTo = path => router.push(path)
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
  const nama = user?.user_metadata?.name || profile?.name || user?.email?.split('@')[0] || 'Admin'
  const namaUcapan = nama.charAt(0).toUpperCase() + nama.slice(1)
  const teksAnimasi = [`Hai ${namaUcapan}`, 'Tambah Data Penjualan 📥', 'Pastikan data kamu benar!']
  const avatarSrc = profile?.avatar_url || "/default-avatar.png"

  return (
    <div className={`dashboard-bg${sidebarOpen ? '' : ' sidebar-hide'}`}>
      <header className="dashboard-header-bar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(s => !s)}>
          <svg width="29" height="29"><rect y="5" width="24" height="3" rx="1" fill="#4681f6"/><rect y="11" width="24" height="3" rx="1" fill="#4681f6"/><rect y="17" width="24" height="3" rx="1" fill="#4681f6"/></svg>
        </button>
        <span className="header-center"><Typewriter texts={teksAnimasi} /></span>
        <div className="header-profile" onClick={() => goTo('/profile')}>
          <img src={avatarSrc} alt="profile" style={{ objectFit: 'cover', width: 34, height: 34, borderRadius: '100%', border: '1.5px solid #b1d2fc', background: "#f4f7fd" }} />
        </div>
      </header>

      <aside className={`dashboard-sidebar${sidebarOpen ? '' : ' hide'}`}>
        <div className="sidebar-logo">ADMIN</div>
        <ul>
          <li onClick={() => goTo('/dashboard')}>Dashboard</li>
          <li className="active">Tambah</li>
          <li onClick={() => goTo('/history')}>History Pesanan</li>
          <li onClick={() => goTo('/setting')}>Setting</li>
        </ul>
        <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="dashboard-main">
        <h2>Tambah Data Penjualan</h2>
        {msg && <div className={`notif-popup ${msg.includes('Gagal') ? 'notif-error' : 'notif-success'}`}>{msg}</div>}

        <div className="form-nota-wrapper">
          <form onSubmit={handleSubmit} className="tambah-form">
            <div className="input-wrapper">
              <label htmlFor="aplikasi_id">Nama Aplikasi</label>
              <select className="input" name="aplikasi_id" value={form.aplikasi_id} onChange={handleChange} required>
                <option value="">-- Pilih Aplikasi --</option>
                {aplikasiList.map(app => (
                  <option key={app.id} value={app.id}>{app.nama_aplikasi}</option>
                ))}
              </select>
            </div>

            {[{ label: 'Nomor Telepon', name: 'nomor_telepon' }, { label: 'Jumlah Order', name: 'jumlah_order' }].map(item => (
              <div key={item.name} className="input-wrapper">
                <label htmlFor={item.name}>{item.label}</label>
                <input className="input" id={item.name} name={item.name} type="text" value={form[item.name]} onChange={handleChange} required />
              </div>
            ))}

            <div className="input-wrapper">
              <label htmlFor="durasi_jenis">Durasi</label>
              <select className="input" name="durasi_jenis" value={form.durasi_jenis} onChange={handleChange} required>
                <option value="">-- Pilih Durasi --</option>
                <option value="harian">Harian</option>
                <option value="mingguan">Mingguan</option>
                <option value="bulanan">Bulanan</option>
                <option value="tahunan">Tahunan</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>

            <div className="input-wrapper">
              <label htmlFor="durasi_total">Total Durasi</label>
              <input className="input" id="durasi_total" name="durasi_total" type="number" value={form.durasi_total} onChange={handleChange} required={form.durasi_jenis !== 'lifetime'} disabled={form.durasi_jenis === 'lifetime'} />
            </div>

            {[{ label: 'Harga Beli', name: 'harga_beli' }, { label: 'Harga Jual', name: 'harga_jual' }, { label: 'Tanggal Mulai', name: 'tanggal_mulai', type: 'date' }].map(item => (
              <div key={item.name} className="input-wrapper">
                <label htmlFor={item.name}>{item.label}</label>
                <input className="input" id={item.name} name={item.name} type={item.type || 'text'} value={form[item.name]} onChange={handleChange} required />
              </div>
            ))}

            <button type="submit" className="btn-simpan-tambah">Simpan</button>
          </form>

          {showNota && (
            <div className="nota-wrapper">
              <button onClick={downloadNotaAsImage} className="btn-cetak-nota">Cetak Nota</button>
              <div className="nota-preview" id="nota-print">
                <div className="nota-box">
                  <p className="nota-title">{namaUcapan}</p>
                  <p className="nota-sub">Nota By Kannohouse - RAYCAP</p>
                  <p className="nota-sub">------------------------------</p>
                  <p>Waktu: {new Date().toLocaleString()}</p>
                  <p>Order: {form.nomor_telepon}</p>
                  <p>Kasir: {profile?.name}</p>
                  <p className="nota-sub">=================================</p>
                  <p>{aplikasiList.find(a => a.id === form.aplikasi_id)?.nama_aplikasi} <span>Rp{parseInt(form.harga_jual).toLocaleString()}</span></p>
                  <p>Jumlah: {form.jumlah_order}</p>
                  <p>Durasi: {form.durasi_total} {form.durasi_jenis}</p>
                  <p className="nota-sub">------------------------------</p>
                  <p className="nota-total">Total Bayar <span>Rp{parseInt(form.harga_jual).toLocaleString()}</span></p>
                  <p className="nota-sub">------------------------------</p>
                  <p>Note! : Kehilangan Nota Maka Garansi Akan Hangus </p>
                  <p className="nota-sub">------------------------------</p>
                  {profile?.qris_url && (
                    <div className="qris-box">
                      <img src={profile.qris_url} alt="QRIS" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
