'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import './dashboard.css'

// Komponen Typewriter animasi header
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

  return (
    <span className="typewriter">
      {display}
      <span className="type-cursor" />
    </span>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profile, setProfile] = useState(null) // <-- untuk data admin
  const router = useRouter()
  const [avatarError, setAvatarError] = useState(false)

  // Ambil data user auth + admin
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push('/login')
      setUser(data.session.user)
      // Setelah dapat user, fetch profile
      const email = data.session.user.email
      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single()
      if (admin) setProfile(admin)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) router.push('/login')
      else setUser(session.user)
    })
    return () => { listener?.subscription?.unsubscribe() }
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Nama untuk header
  const nama = user?.user_metadata?.name || profile?.name || user?.email?.split('@')[0] || 'Admin'
  const namaUcapan = nama.charAt(0).toUpperCase() + nama.slice(1)
  const goTo = path => router.push(path)

  // Teks animasi header
  const teksAnimasi = [
    `Halo kak ${namaUcapan}`,
    'Selamat datang di dashboard',
    'Data recap premium apps 🎬'
  ]

  // Foto profil dari table admins (bukan dari user_metadata, agar selalu update)
  const avatarSrc =
    !avatarError && profile?.avatar_url
      ? profile.avatar_url
      : "/default-avatar.png"

  if (!user) return <div className="dashboard-loading">Loading...</div>

  return (
    <div className={`dashboard-bg${sidebarOpen ? '' : ' sidebar-hide'}`}>
      {/* HEADER */}
      <header className="dashboard-header-bar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(s => !s)}>
          <svg width="29" height="29" viewBox="0 0 24 24">
            <rect y="5" width="24" height="3" rx="1" fill="#4681f6"/>
            <rect y="11" width="24" height="3" rx="1" fill="#4681f6"/>
            <rect y="17" width="24" height="3" rx="1" fill="#4681f6"/>
          </svg>
        </button>
        <span className="header-center">
          <Typewriter texts={teksAnimasi} />
        </span>
        <div className="header-profile" onClick={() => goTo('/profile')}>
          <img
            src={avatarSrc}
            alt="profile"
            onError={() => setAvatarError(true)}
            style={{
              objectFit: 'cover',
              width: 34, height: 34, borderRadius: '100%',
              border: '1.5px solid #b1d2fc', background: "#f4f7fd"
            }}
          />
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className={`dashboard-sidebar${sidebarOpen ? '' : ' hide'}`}>
        <div className="sidebar-logo">ADMIN</div>
        <ul>
          <li onClick={() => goTo('/dashboard')} className="active">Dashboard</li>
          <li onClick={() => goTo('/tambah')}>Tambah</li>
          <li onClick={() => goTo('/history')}>History Pesanan</li>
          <li onClick={() => goTo('/setting')}>Setting</li>
        </ul>
        <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
      </aside>

      {/* MAIN */}
      <main className="dashboard-main">
        <div className="dashboard-cards">
          <div className="card">
            <h4>Total Pemasukan</h4>
            <p className="value">Rp 12.500.000</p>
          </div>
          <div className="card">
            <h4>Total Orderan Masuk</h4>
            <p className="value">187</p>
          </div>
          <div className="card">
            <h4>Aplikasi Terlaris</h4>
            <p className="value">Netflix Premium</p>
          </div>
          <div className="card">
            <h4>Kenaikan / Penurunan</h4>
            <p className="value" style={{color:"#38b000"}}>+12.6%</p>
          </div>
        </div>
        <div className="dashboard-rows">
          <div className="row-graph">
            <h4>Grafik Pemasukan</h4>
            <svg width="100%" height="160" viewBox="0 0 370 160">
              <polyline
                fill="none"
                stroke="#4681f6"
                strokeWidth="4"
                points="0,140 45,110 90,120 135,70 180,90 225,40 270,60 315,20 370,50"
              />
              <polyline
                fill="rgba(70,129,246,0.1)"
                stroke="none"
                points="0,160 0,140 45,110 90,120 135,70 180,90 225,40 270,60 315,20 370,50 370,160"
              />
              <g>
                <text x="10" y="155" fontSize="13" fill="#bbb">Jan</text>
                <text x="60" y="155" fontSize="13" fill="#bbb">Feb</text>
                <text x="110" y="155" fontSize="13" fill="#bbb">Mar</text>
                <text x="160" y="155" fontSize="13" fill="#bbb">Apr</text>
                <text x="210" y="155" fontSize="13" fill="#bbb">Mei</text>
                <text x="260" y="155" fontSize="13" fill="#bbb">Jun</text>
                <text x="310" y="155" fontSize="13" fill="#bbb">Jul</text>
              </g>
            </svg>
          </div>
          <div className="row-pie">
            <h4>Presentasi Orderan</h4>
            <svg viewBox="0 0 120 120" width="110" height="110">
              <circle r="50" cx="60" cy="60" fill="#eef4fa" />
              <circle
                r="50"
                cx="60"
                cy="60"
                fill="none"
                stroke="#4681f6"
                strokeWidth="18"
                strokeDasharray="314"
                strokeDashoffset="78"
                strokeLinecap="round"
              />
              <circle
                r="50"
                cx="60"
                cy="60"
                fill="none"
                stroke="#38b000"
                strokeWidth="18"
                strokeDasharray="314"
                strokeDashoffset="236"
                strokeLinecap="round"
              />
              <text x="60" y="66" fontSize="18" fill="#222" fontWeight="bold" textAnchor="middle">75%</text>
            </svg>
            <div style={{fontSize:13, marginTop:6}}>Order: 75% Netflix, 25% Lainnya</div>
          </div>
        </div>
      </main>
    </div>
  )
}
