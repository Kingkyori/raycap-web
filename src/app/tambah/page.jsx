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
    aplikasi_id: '', nomor_telepon: '', jumlah_order: '', durasi_jenis: '', durasi_total: '', harga_beli: '', harga_jual: '', tanggal_mulai: '', note: 'Kehilangan nota akan menghanguskan garansi'
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push('/login')
      setUser(data.session.user)
      const email = data.session.user.email
      const { data: admin } = await supabase.from('admins').select('*').eq('email', email).single()
      if (admin) setProfile(admin)
      
      // Load aplikasi list dengan error handling
      try {
        const { data: apps, error } = await supabase
          .from('aplikasi_premium')
          .select('id, nama_aplikasi')
          .order('nama_aplikasi')
          
        if (error) {
          console.error('Error loading aplikasi:', error)
          setMsg('❌ Gagal memuat daftar aplikasi: ' + error.message)
        } else if (apps && apps.length > 0) {
          setAplikasiList(apps)
        } else {
          setMsg('⚠️ Tidak ada aplikasi tersedia')
        }
      } catch (err) {
        console.error('Error:', err)
        setMsg('❌ Terjadi kesalahan saat memuat aplikasi')
      }
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
    if (!mulai || !jenis) return null
    if (jenis === 'lifetime') return '2099-12-31'
    if (!total || total <= 0) return null
    
    const date = new Date(mulai)
    const totalNum = parseInt(total)
    
    switch (jenis) {
      case 'hari': 
        date.setDate(date.getDate() + totalNum)
        break
      case 'minggu': 
        date.setDate(date.getDate() + (totalNum * 7))
        break
      case 'bulan': 
        date.setMonth(date.getMonth() + totalNum)
        break
      case 'tahun': 
        date.setFullYear(date.getFullYear() + totalNum)
        break
      default:
        return null
    }
    return date.toISOString().split('T')[0]
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!user) {
      setMsg('❌ Pengguna tidak terautentikasi')
      return
    }
    
    // Validasi form
    if (!form.aplikasi_id || !form.nomor_telepon || !form.jumlah_order || 
        !form.durasi_jenis || !form.harga_beli || !form.harga_jual || !form.tanggal_mulai) {
      setMsg('❌ Harap lengkapi semua field yang diperlukan')
      return
    }
    
    // Validasi durasi_total untuk non-lifetime
    if (form.durasi_jenis !== 'lifetime' && (!form.durasi_total || form.durasi_total <= 0)) {
      setMsg('❌ Durasi total harus diisi untuk jenis durasi selain lifetime')
      return
    }
    
    try {
      // Untuk lifetime, set durasi_total ke 1
      const durasiTotal = form.durasi_jenis === 'lifetime' ? 1 : parseInt(form.durasi_total)
      const tanggal_selesai = calculateTanggalSelesai(form.tanggal_mulai, form.durasi_jenis, durasiTotal)
      
      if (!tanggal_selesai) {
        setMsg('❌ Gagal menghitung tanggal selesai')
        return
      }
      
      // Validasi aplikasi_id - pastikan ini adalah UUID yang valid, bukan integer
      if (!form.aplikasi_id || form.aplikasi_id === '0') {
        setMsg('❌ Harap pilih aplikasi yang valid')
        return
      }
      
      const { error } = await supabase.from('penjualan').insert([{
        user_id: user.id,
        aplikasi_id: form.aplikasi_id, // Kirim sebagai string UUID, jangan di-parseInt
        jumlah_order: parseInt(form.jumlah_order),
        harga_beli: parseInt(form.harga_beli),
        harga_jual: parseInt(form.harga_jual),
        tanggal_mulai: form.tanggal_mulai,
        tanggal_selesai,
        nomor_telepon: form.nomor_telepon,
        durasi_jenis: form.durasi_jenis,
        durasi_total: durasiTotal,
        note: form.note || ''
      }])

      if (error) {
        console.error('Database error:', error)
        setMsg('❌ Gagal menyimpan data: ' + error.message)
      } else {
        setMsg('✅ Data berhasil disimpan!')
        setShowNota(true)
      }
    } catch (err) {
      console.error('Submit error:', err)
      setMsg('❌ Terjadi kesalahan saat menyimpan data')
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

  const handleReset = () => {
    setForm({
      aplikasi_id: '', nomor_telepon: '', jumlah_order: '', durasi_jenis: '', durasi_total: '', harga_beli: '', harga_jual: '', tanggal_mulai: '', note: 'Kehilangan nota akan menghanguskan garansi'
    })
    setShowNota(false)
    setMsg('')
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
              <select className="input" id="aplikasi_id" name="aplikasi_id" value={form.aplikasi_id} onChange={handleChange} required>
                <option value="">-- Pilih Aplikasi --</option>
                {aplikasiList.length === 0 ? (
                  <option value="" disabled>Memuat aplikasi...</option>
                ) : (
                  aplikasiList.map(app => (
                    <option key={app.id} value={app.id}>{app.nama_aplikasi}</option>
                  ))
                )}
              </select>
              {aplikasiList.length === 0 && (
                <small style={{color: '#666', fontSize: '12px', marginTop: '4px'}}>
                  Jika aplikasi tidak muncul, coba refresh halaman
                </small>
              )}
            </div>

            {[{ label: 'Nomor Telepon', name: 'nomor_telepon', type: 'tel' }, { label: 'Jumlah Order', name: 'jumlah_order', type: 'number' }].map(item => (
              <div key={item.name} className="input-wrapper">
                <label htmlFor={item.name}>{item.label}</label>
                <input className="input" id={item.name} name={item.name} type={item.type || 'text'} value={form[item.name]} onChange={handleChange} required />
              </div>
            ))}

            <div className="input-wrapper">
              <label htmlFor="durasi_jenis">Durasi</label>
              <select className="input" id="durasi_jenis" name="durasi_jenis" value={form.durasi_jenis} onChange={handleChange} required>
                <option value="">-- Pilih Durasi --</option>
                <option value="hari">Hari</option>
                <option value="minggu">Minggu</option>
                <option value="bulan">Bulan</option>
                <option value="tahun">Tahun</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>

            <div className="input-wrapper">
              <label htmlFor="durasi_total">Total Durasi</label>
              <input 
                className="input" 
                id="durasi_total" 
                name="durasi_total" 
                type="number" 
                value={form.durasi_jenis === 'lifetime' ? '' : form.durasi_total} 
                onChange={handleChange} 
                required={form.durasi_jenis !== 'lifetime'} 
                disabled={form.durasi_jenis === 'lifetime'}
                placeholder={form.durasi_jenis === 'lifetime' ? 'Lifetime - tidak perlu diisi' : 'Masukkan total durasi'}
              />
            </div>

            {[{ label: 'Harga Beli', name: 'harga_beli' }, { label: 'Harga Jual', name: 'harga_jual' }, { label: 'Tanggal Mulai', name: 'tanggal_mulai', type: 'date' }].map(item => (
              <div key={item.name} className="input-wrapper">
                <label htmlFor={item.name}>{item.label}</label>
                <input className="input" id={item.name} name={item.name} type={item.type || 'text'} value={form[item.name]} onChange={handleChange} required />
              </div>
            ))}

            <div className="input-wrapper">
              <label htmlFor="note">Catatan</label>
              <textarea 
                className="input" 
                id="note" 
                name="note" 
                value={form.note} 
                onChange={handleChange}
                placeholder="Catatan default sudah terisi, bisa diedit atau dihapus sesuai kebutuhan"
                rows="3"
              />
            </div>

            <button type="submit" className="btn-simpan-tambah">Simpan</button>
          </form>

          {showNota && (
            <div className="nota-wrapper">
              <div className="nota-buttons">
                <button onClick={downloadNotaAsImage} className="btn-cetak-nota">Cetak Nota</button>
                <button onClick={handleReset} className="btn-reset-nota">Reset Form</button>
              </div>
              <div className="nota-preview" id="nota-print">
                <div className="nota-box">
                  <p className="nota-title">{namaUcapan}</p>
                  <p className="nota-sub">Nota By Kannohouse - RAYCAP</p>
                  <p className="nota-sub">------------------------------</p>
                  <p>Waktu: {new Date().toLocaleString()}</p>
                  <p>Order: {form.nomor_telepon}</p>
                  <p>Kasir: {profile?.name}</p>
                  <p className="nota-sub">=================================</p>
                  <p>{aplikasiList.find(a => a.id === form.aplikasi_id)?.nama_aplikasi || 'Aplikasi tidak ditemukan'} <span>Rp{parseInt(form.harga_jual).toLocaleString()}</span></p>
                  <p>Jumlah: {form.jumlah_order}</p>
                  <p>Durasi: {form.durasi_jenis === 'lifetime' ? 'Lifetime' : `${form.durasi_total} ${form.durasi_jenis}`}</p>
                  <p className="nota-sub">------------------------------</p>
                  <p className="nota-total">Total Bayar <span>Rp{parseInt(form.harga_jual).toLocaleString()}</span></p>
                  <p className="nota-sub">------------------------------</p>
                  {form.note && (
                    <>
                      <p className="nota-note">Note! {form.note}</p>
                      <p className="nota-sub">------------------------------</p>
                    </>
                  )}
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
