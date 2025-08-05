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
  const [loading, setLoading] = useState(true)
  const [filterPeriode, setFilterPeriode] = useState('harian') // harian, bulanan, tahunan
  const router = useRouter()

  const [totalPemasukan, setTotalPemasukan] = useState(0)
  const [totalModal, setTotalModal] = useState(0)
  const [totalKeuntungan, setTotalKeuntungan] = useState(0)
  const [topApp, setTopApp] = useState('-')

  const grafikRef = useRef(null)
  const pieRef = useRef(null)
  const grafikChart = useRef(null)
  const pieChart = useRef(null)

  // Fungsi untuk filter data berdasarkan periode
  const filterDataByPeriode = (penjualan, periode) => {
    const now = new Date()
    const filtered = penjualan.filter(d => {
      // Pastikan created_at ada dan valid
      if (!d.created_at) return false
      
      const date = new Date(d.created_at)
      // Pastikan date valid
      if (isNaN(date.getTime())) return false
      
      switch (periode) {
        case 'harian':
          // Data hari ini saja untuk summary cards
          const today = new Date(now)
          today.setHours(0, 0, 0, 0)
          const tomorrow = new Date(today)
          tomorrow.setDate(today.getDate() + 1)
          return date >= today && date < tomorrow
        case 'bulanan':
          // Data bulan ini
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
        case 'tahunan':
          // Data tahun ini
          return date.getFullYear() === now.getFullYear()
        default:
          return true
      }
    })
    
    return filtered
  }

  // Fungsi terpisah untuk filter data grafik
  const filterDataForGrafik = (penjualan, periode) => {
    const now = new Date()
    
    const filtered = penjualan.filter(d => {
      if (!d.created_at) return false
      
      const date = new Date(d.created_at)
      if (isNaN(date.getTime())) return false
      
      switch (periode) {
        case 'harian':
          // Untuk grafik harian, gunakan 7 hari terakhir
          const sevenDaysAgo = new Date(now)
          sevenDaysAgo.setDate(now.getDate() - 6)
          sevenDaysAgo.setHours(0, 0, 0, 0)
          return date >= sevenDaysAgo
        case 'bulanan':
          // Untuk grafik bulanan, tampilkan semua bulan yang ada data (tidak dibatasi tahun ini saja)
          return true // Tampilkan semua data untuk grafik bulanan
        case 'tahunan':
          // Untuk grafik tahunan, tampilkan semua tahun yang ada data
          return true // Tampilkan semua data untuk grafik tahunan
        default:
          return true
      }
    })
    
    return filtered
  }

  // Fungsi untuk generate data grafik berdasarkan periode
  const generateGrafikData = (penjualan, periode) => {
    const data = {}
    
    if (periode === 'harian') {
      // Untuk grafik harian, buat 7 hari terakhir dengan nilai 0 terlebih dahulu
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(now.getDate() - i)
        const key = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
        data[key] = 0
      }
    }
    
    penjualan.forEach(d => {
      // Skip jika tidak ada created_at atau tidak valid
      if (!d.created_at) return
      
      let key
      const date = new Date(d.created_at)
      
      // Skip jika tanggal tidak valid
      if (isNaN(date.getTime())) return
      
      switch (periode) {
        case 'harian':
          // Format: DD/MM
          key = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'bulanan':
          // Format: MMM YYYY
          key = date.toLocaleString('id-ID', { month: 'short', year: 'numeric' })
          break
        case 'tahunan':
          // Format: YYYY
          key = date.getFullYear().toString()
          break
        default:
          key = date.toLocaleString('id-ID', { month: 'short', year: 'numeric' })
      }
      
      data[key] = (data[key] || 0) + (d.harga_jual || 0)
    })
    
    // Urutkan data berdasarkan periode
    if (periode === 'bulanan') {
      // Urutkan data bulanan berdasarkan tanggal (chronological order)
      const sortedEntries = Object.entries(data).sort((a, b) => {
        const [monthA, yearA] = a[0].split(' ')
        const [monthB, yearB] = b[0].split(' ')
        
        // Konversi nama bulan Indonesia ke angka
        const monthMap = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
          'Jul': 6, 'Agu': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11
        }
        
        const yearDiff = parseInt(yearA) - parseInt(yearB)
        if (yearDiff !== 0) return yearDiff
        
        return monthMap[monthA] - monthMap[monthB]
      })
      const sortedData = {}
      sortedEntries.forEach(([key, value]) => {
        sortedData[key] = value
      })
      return sortedData
    } else if (periode === 'tahunan') {
      // Urutkan data tahunan
      const sortedEntries = Object.entries(data).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      const sortedData = {}
      sortedEntries.forEach(([key, value]) => {
        sortedData[key] = value
      })
      return sortedData
    }
    
    return data
  }

  useEffect(() => {
    let mounted = true
    
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const { data: session } = await supabase.auth.getSession()
        
        if (!session.session) {
          router.push('/login')
          return
        }
        
        if (!mounted) return
        setUser(session.session.user)

        const email = session.session.user.email
        const { data: admin } = await supabase.from('admins').select('*').eq('email', email).single()
        if (!mounted) return
        setProfile(admin)

        const { data: penjualan } = await supabase
          .from('penjualan')
          .select('*, aplikasi_premium(nama_aplikasi)')
          .eq('user_id', admin.id)
          .order('created_at', { ascending: false })

        if (!mounted || !penjualan) return
        setData(penjualan)

        // Debug: Log data untuk troubleshooting
        console.log('Raw penjualan data:', penjualan.map(d => ({
          id: d.id,
          created_at: d.created_at,
          harga_jual: d.harga_jual,
          aplikasi: d.aplikasi_premium?.nama_aplikasi
        })))

        // Filter data berdasarkan periode yang dipilih
        const filteredData = filterDataByPeriode(penjualan, filterPeriode)
        console.log('Filtered data for', filterPeriode, ':', filteredData.length)

        // Kalkulasi data dengan optimasi berdasarkan data yang sudah difilter
        const pemasukan = filteredData.reduce((acc, d) => acc + (d.harga_jual || 0), 0)
        const modal = filteredData.reduce((acc, d) => acc + (d.harga_beli || 0), 0)
        const keuntungan = pemasukan - modal

        setTotalPemasukan(pemasukan)
        setTotalModal(modal)
        setTotalKeuntungan(keuntungan)

        // Data untuk chart berdasarkan data yang sudah difilter
        const count = {}
        
        filteredData.forEach(d => {
          const namaApp = d.aplikasi_premium?.nama_aplikasi || 'Lainnya'
          count[namaApp] = (count[namaApp] || 0) + 1
        })

        setTopApp(Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || '-')
        setPieData(count)
        
        // Generate grafik data berdasarkan filter periode - gunakan fungsi khusus untuk grafik
        const grafikData = generateGrafikData(filterDataForGrafik(filteredData, filterPeriode), filterPeriode)
        setGrafik(grafikData)

        // Notifikasi masa aktif
        const now = new Date()
        const fiveDaysLater = new Date(now)
        fiveDaysLater.setDate(now.getDate() + 5)

        const habis = penjualan.filter(p =>
          p.tanggal_selesai &&
          new Date(p.tanggal_selesai) <= fiveDaysLater &&
          new Date(p.tanggal_selesai) >= now
        )

        setNotifikasi(habis)
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadDashboardData()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && mounted) {
        router.push('/login')
      }
    })

    return () => {
      mounted = false
      
      // Cleanup charts
      if (grafikChart.current) {
        try {
          grafikChart.current.destroy()
        } catch (error) {
          console.log('Cleanup error:', error)
        }
        grafikChart.current = null
      }
      
      if (pieChart.current) {
        try {
          pieChart.current.destroy()
        } catch (error) {
          console.log('Cleanup error:', error)
        }
        pieChart.current = null
      }
      
      listener?.subscription?.unsubscribe()
    }
    }, [router])

  // Update semua data saat filter periode berubah
  useEffect(() => {
    if (data.length > 0) {
      console.log('Filter changed to:', filterPeriode)
      
      // Filter data berdasarkan periode yang dipilih
      const filteredData = filterDataByPeriode(data, filterPeriode)
      console.log('Filtered data count:', filteredData.length)

      // Update kalkulasi data
      const pemasukan = filteredData.reduce((acc, d) => acc + (d.harga_jual || 0), 0)
      const modal = filteredData.reduce((acc, d) => acc + (d.harga_beli || 0), 0)
      const keuntungan = pemasukan - modal

      console.log('Updated values:', { pemasukan, modal, keuntungan })

      setTotalPemasukan(pemasukan)
      setTotalModal(modal)
      setTotalKeuntungan(keuntungan)

      // Update data untuk pie chart
      const count = {}
      filteredData.forEach(d => {
        const namaApp = d.aplikasi_premium?.nama_aplikasi || 'Lainnya'
        count[namaApp] = (count[namaApp] || 0) + 1
      })

      setTopApp(Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || '-')
      setPieData(count)

      // Update grafik data - gunakan fungsi khusus untuk grafik
      const grafikData = generateGrafikData(filterDataForGrafik(data, filterPeriode), filterPeriode)
      setGrafik(grafikData)
    }
  }, [filterPeriode, data])  // LINE CHART dengan error handling
  useEffect(() => {
    if (!grafikRef.current) return
    
    // Cleanup existing chart
    if (grafikChart.current) {
      try {
        grafikChart.current.destroy()
      } catch (error) {
        console.log('Error destroying line chart:', error)
      }
      grafikChart.current = null
    }

    // Check if we have data
    if (Object.keys(grafik).length === 0) return

    try {
      const ctx = grafikRef.current.getContext('2d')
      if (!ctx) return

      grafikChart.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: Object.keys(grafik),
          datasets: [{
            label: 'Pemasukan (Rp)',
            data: Object.values(grafik),
            borderColor: '#4681f6',
            backgroundColor: 'rgba(70,129,246,0.1)',
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: { 
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              callbacks: {
                label: function(context) {
                  return 'Rp ' + context.parsed.y.toLocaleString()
                }
              }
            }
          },
          scales: {
            x: {
              grid: { 
                color: 'rgba(0,0,0,0.1)',
                display: true
              },
              ticks: {
                maxRotation: 45
              }
            },
            y: {
              beginAtZero: true,
              grid: { 
                color: 'rgba(0,0,0,0.1)',
                display: true
              },
              ticks: {
                callback: function(value) {
                  return 'Rp ' + value.toLocaleString()
                }
              }
            }
          }
        }
      })
    } catch (error) {
      console.error('Error creating line chart:', error)
    }

    return () => {
      if (grafikChart.current) {
        try {
          grafikChart.current.destroy()
        } catch (error) {
          console.log('Cleanup error for line chart:', error)
        }
        grafikChart.current = null
      }
    }
  }, [grafik])

  // PIE CHART dengan error handling
  useEffect(() => {
    if (!pieRef.current) return
    
    // Cleanup existing chart
    if (pieChart.current) {
      try {
        pieChart.current.destroy()
      } catch (error) {
        console.log('Error destroying pie chart:', error)
      }
      pieChart.current = null
    }

    // Check if we have data
    if (Object.keys(pieData).length === 0) return

    try {
      const ctx = pieRef.current.getContext('2d')
      if (!ctx) return

      pieChart.current = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: Object.keys(pieData),
          datasets: [{
            label: 'Jumlah Order',
            data: Object.values(pieData),
            backgroundColor: [
              '#4681f6', '#ff6384', '#36a2eb', '#ffce56', '#9ccc65',
              '#ff9f40', '#c9cbcf', '#4bc0c0', '#ff6b6b', '#feca57'
            ],
            borderWidth: 2,
            borderColor: '#fff',
            hoverBorderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: true
          },
          plugins: { 
            legend: { 
              position: 'right',
              labels: {
                padding: 15,
                usePointStyle: true,
                font: { size: 11 },
                generateLabels: function(chart) {
                  const data = chart.data
                  if (data.labels.length && data.datasets.length) {
                    return data.labels.map((label, i) => ({
                      text: label,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      strokeStyle: data.datasets[0].borderColor,
                      lineWidth: data.datasets[0].borderWidth,
                      pointStyle: 'circle',
                      hidden: false,
                      index: i
                    }))
                  }
                  return []
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0)
                  const percentage = ((context.parsed / total) * 100).toFixed(1)
                  return context.label + ': ' + context.parsed + ' (' + percentage + '%)'
                }
              }
            }
          }
        }
      })
    } catch (error) {
      console.error('Error creating pie chart:', error)
    }

    return () => {
      if (pieChart.current) {
        try {
          pieChart.current.destroy()
        } catch (error) {
          console.log('Cleanup error for pie chart:', error)
        }
        pieChart.current = null
      }
    }
  }, [pieData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const goTo = path => router.push(path)
  
  // Fungsi untuk menghapus notifikasi dari tampilan (tanpa menghapus dari database)
  const hapusNotifikasi = (index) => {
    const item = notifikasi[index]
    const namaApp = item.aplikasi_premium?.nama_aplikasi || 'Aplikasi'
    
    const konfirmasi = window.confirm(
      `Apakah Anda yakin ingin menghapus notifikasi "${namaApp}" dari tampilan?\n\n` +
      `Catatan: Data ini hanya akan dihapus dari tampilan dashboard, tidak dari database.`
    )
    
    if (konfirmasi) {
      const updatedNotifikasi = notifikasi.filter((_, i) => i !== index)
      setNotifikasi(updatedNotifikasi)
    }
  }
  
  const getGrafikTitle = () => {
    switch (filterPeriode) {
      case 'harian': return 'Grafik Pemasukan Harian (7 Hari Terakhir)'
      case 'bulanan': return 'Grafik Pemasukan Bulanan (Semua Bulan)'
      case 'tahunan': return 'Grafik Pemasukan Tahunan (Semua Tahun)'
      default: return 'Grafik Pemasukan'
    }
  }

  const getPeriodeLabel = () => {
    switch (filterPeriode) {
      case 'harian': return '(Hari Ini)'
      case 'bulanan': return '(Bulan Ini)'
      case 'tahunan': return '(Tahun Ini)'
      default: return ''
    }
  }
  
  const nama = user?.user_metadata?.name || profile?.name || user?.email?.split('@')[0]
  const ucapan = nama?.charAt(0).toUpperCase() + nama?.slice(1)
  const teksAnimasi = [`Halo kak ${ucapan}`, 'Selamat datang di dashboard', 'Data recap premium apps 🎬']
  const avatarSrc = profile?.avatar_url || '/default-avatar.png'

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div>Loading Dashboard...</div>
      </div>
    )
  }

  if (!user) return null

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
          <img src={avatarSrc} alt="profile" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
        </div>
      </header>

      <aside className={`dashboard-sidebar${sidebarOpen ? '' : ' hide'}`}>
        <div className="sidebar-logo">ADMIN</div>
        <ul>
          <li onClick={() => goTo('/dashboard')} className="active">Dashboard</li>
          <li onClick={() => goTo('/tambah')}>Tambah</li>
          <li onClick={() => goTo('/history')}>History</li>
        </ul>
        <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-cards">
          <div className="card">
            <h4>Total Pemasukan {getPeriodeLabel()}</h4>
            <p className="value">Rp {totalPemasukan.toLocaleString()}</p>
          </div>
          <div className="card">
            <h4>Total Keuntungan {getPeriodeLabel()}</h4>
            <p className="value">Rp {totalKeuntungan.toLocaleString()}</p>
          </div>
          <div className="card">
            <h4>Total Modal {getPeriodeLabel()}</h4>
            <p className="value">Rp {totalModal.toLocaleString()}</p>
          </div>
          <div className="card">
            <h4>Aplikasi Terlaris {getPeriodeLabel()}</h4>
            <p className="value">{topApp}</p>
          </div>
        </div>

        {/* Filter Periode */}
        <div className="filter-section">
          <h3>Filter Periode Grafik</h3>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filterPeriode === 'harian' ? 'active' : ''}`}
              onClick={() => setFilterPeriode('harian')}
            >
              Harian
            </button>
            <button 
              className={`filter-btn ${filterPeriode === 'bulanan' ? 'active' : ''}`}
              onClick={() => setFilterPeriode('bulanan')}
            >
              Bulanan
            </button>
            <button 
              className={`filter-btn ${filterPeriode === 'tahunan' ? 'active' : ''}`}
              onClick={() => setFilterPeriode('tahunan')}
            >
              Tahunan
            </button>
          </div>
        </div>

        <div className="dashboard-rows">
          <div className="row-graph">
            <h4>{getGrafikTitle()}</h4>
            {/* Debug info - hapus ini setelah masalah teratasi */}
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Debug: Total data = {data.length}, Summary data = {filterDataByPeriode(data, filterPeriode).length}, 
              Grafik data = {filterDataForGrafik(data, filterPeriode).length}, 
              Periode = {filterPeriode}, Grafik keys = {Object.keys(grafik).length}
            </div>
            <div style={{ position: 'relative', height: '200px', width: '100%' }}>
              <canvas ref={grafikRef} />
            </div>
          </div>
          <div className="row-pie">
            <h4>Presentasi Orderan</h4>
            <div style={{ position: 'relative', height: '200px', width: '100%' }}>
              <canvas ref={pieRef} />
            </div>
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
                <span>Aksi</span>
              </div>
              {notifikasi.map((item, i) => (
                <div className="notif-row" key={i}>
                  <span>{item.aplikasi_premium?.nama_aplikasi || '-'}</span>
                  <span>{item.nomor_telepon || '-'}</span>
                  <span>{new Date(item.tanggal_selesai).toLocaleDateString('id-ID')}</span>
                  <span>
                    <button 
                      className="hapus-notif-btn"
                      onClick={() => hapusNotifikasi(i)}
                      title="Hapus dari tampilan"
                    >
                      🗑️
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
