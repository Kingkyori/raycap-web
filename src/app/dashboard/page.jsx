'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Chart from 'chart.js/auto'
import './dashboard.css'

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

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [data, setData] = useState([])
  const [grafik, setGrafik] = useState({})
  const [pieData, setPieData] = useState({})
  const [notifikasi, setNotifikasi] = useState([])
  const router = useRouter()

  const [totalPemasukan, setTotalPemasukan] = useState(0)
  const [totalModal, setTotalModal] = useState(0)
  const [totalKeuntungan, setTotalKeuntungan] = useState(0)
  const [topApp, setTopApp] = useState('-')

  const grafikRef = useRef(null)
  const pieRef = useRef(null)
  const grafikChart = useRef(null)
  const pieChart = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push('/login')
      setUser(data.session.user)

      const email = data.session.user.email
      const { data: admin } = await supabase.from('admins').select('*').eq('email', email).single()
      setProfile(admin)

      const { data: penjualan } = await supabase
        .from('penjualan')
        .select('*, aplikasi_premium(nama_aplikasi)')
        .eq('user_id', admin.id)

      setData(penjualan)

      const pemasukan = penjualan.reduce((acc, d) => acc + (d.harga_jual || 0), 0)
      const modal = penjualan.reduce((acc, d) => acc + (d.harga_beli || 0), 0)
      const keuntungan = pemasukan - modal

      setTotalPemasukan(pemasukan)
      setTotalModal(modal)
      setTotalKeuntungan(keuntungan)

      const count = {}
      const monthly = {}

      penjualan.forEach(d => {
        const namaApp = d.aplikasi_premium?.nama_aplikasi || 'Lainnya'
        count[namaApp] = (count[namaApp] || 0) + 1

        const bulan = new Date(d.created_at).toLocaleString('id-ID', { month: 'short' })
        monthly[bulan] = (monthly[bulan] || 0) + (d.harga_jual || 0)
      })

      setTopApp(Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || '-')
      setGrafik(monthly)
      setPieData(count)

      const now = new Date()
      const fiveDaysLater = new Date(now)
      fiveDaysLater.setDate(now.getDate() + 5)

      const habis = penjualan.filter(p =>
        p.tanggal_selesai &&
        new Date(p.tanggal_selesai) <= fiveDaysLater &&
        new Date(p.tanggal_selesai) >= now
      )

      setNotifikasi(habis)
    })
  }, [router])

  // LINE CHART
  useEffect(() => {
    if (!grafikRef.current) return
    if (grafikChart.current) grafikChart.current.destroy()

    grafikChart.current = new Chart(grafikRef.current, {
      type: 'line',
      data: {
        labels: Object.keys(grafik),
        datasets: [{
          label: 'Pemasukan',
          data: Object.values(grafik),
          borderColor: '#4681f6',
          backgroundColor: 'rgba(70,129,246,0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    })
  }, [grafik])

  // PIE CHART
  useEffect(() => {
    if (!pieRef.current) return
    if (pieChart.current) pieChart.current.destroy()

    pieChart.current = new Chart(pieRef.current, {
      type: 'pie',
      data: {
        labels: Object.keys(pieData),
        datasets: [{
          label: 'Orderan',
          data: Object.values(pieData),
          backgroundColor: ['#4681f6', '#ff6384', '#36a2eb', '#ffce56', '#9ccc65']
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'right' } }
      }
    })
  }, [pieData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const goTo = path => router.push(path)
  const nama = user?.user_metadata?.name || profile?.name || user?.email?.split('@')[0]
  const ucapan = nama?.charAt(0).toUpperCase() + nama?.slice(1)
  const teksAnimasi = [`Halo kak ${ucapan}`, 'Selamat datang di dashboard', 'Data recap premium apps 🎬']
  const avatarSrc = profile?.avatar_url || '/default-avatar.png'

  if (!user) return <div className="dashboard-loading">Loading...</div>

  return (
    <div className={`dashboard-bg${sidebarOpen ? '' : ' sidebar-hide'}`}>
      <header className="dashboard-header-bar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <svg width="29" height="29" viewBox="0 0 24 24">
            <rect y="5" width="24" height="3" rx="1" fill="#4681f6" />
            <rect y="11" width="24" height="3" rx="1" fill="#4681f6" />
            <rect y="17" width="24" height="3" rx="1" fill="#4681f6" />
          </svg>
        </button>
        <span className="header-center"><Typewriter texts={teksAnimasi} /></span>
        <div className="header-profile" onClick={() => goTo('/profile')}>
          <img src={avatarSrc} alt="profile" style={{ width: 34, height: 34, borderRadius: '50%' }} />
        </div>
      </header>

      <aside className={`dashboard-sidebar${sidebarOpen ? '' : ' hide'}`}>
        <div className="sidebar-logo">ADMIN</div>
        <ul>
          <li onClick={() => goTo('/dashboard')} className="active">Dashboard</li>
          <li onClick={() => goTo('/tambah')}>Tambah</li>
          <li onClick={() => goTo('/history')}>History</li>
          <li onClick={() => goTo('/setting')}>Setting</li>
        </ul>
        <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-cards">
          <div className="card"><h4>Total Pemasukan</h4><p className="value">Rp {totalPemasukan.toLocaleString()}</p></div>
          <div className="card"><h4>Total Keuntungan</h4><p className="value">Rp {totalKeuntungan.toLocaleString()}</p></div>
          <div className="card"><h4>Total Modal</h4><p className="value">Rp {totalModal.toLocaleString()}</p></div>
          <div className="card"><h4>Aplikasi Terlaris</h4><p className="value">{topApp}</p></div>
        </div>

        <div className="dashboard-rows">
          <div className="row-graph">
            <h4>Grafik Pemasukan</h4>
            <canvas ref={grafikRef} height="120" />
          </div>
          <div className="row-pie">
            <h4>Presentasi Orderan</h4>
            <canvas ref={pieRef} height="120" />
          </div>
        </div>

        {notifikasi.length > 0 && (
          <div className="notif-section">
            <h4 className="notif-title">🔔 Notifikasi: Masa Aktif Aplikasi Akan Habis</h4>
            <div className="notif-table-alt">
              <div className="notif-header">
                <span>Nama Aplikasi</span>
                <span>Nomor Telepon</span>
                <span>Tanggal Habis</span>
              </div>
              {notifikasi.map((item, i) => (
                <div className="notif-row" key={i}>
                  <span>{item.aplikasi_premium?.nama_aplikasi || '-'}</span>
                  <span>{item.nomor_telepon || '-'}</span>
                  <span>{new Date(item.tanggal_selesai).toLocaleDateString('id-ID')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
