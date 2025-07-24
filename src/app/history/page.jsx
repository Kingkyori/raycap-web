'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import '../dashboard/dashboard.css'
import './history.css'

export default function HistoryPage() {
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [filterExpiring, setFilterExpiring] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const teksAnimasi = ['Selamat datang kembali, Admin']
  const avatarSrc = '/globe.svg'

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data, error } = await supabase
      .from('penjualan')
      .select(`*, aplikasi_premium(nama_aplikasi)`)
      .order('created_at', { ascending: false })

    if (!error) setData(data)
  }

  const filteredData = data.filter(item => {
    const tanggalSelesai = new Date(item.tanggal_selesai)
    const now = new Date()
    const timeDiff = tanggalSelesai.getTime() - now.getTime()
    const diffDays = timeDiff / (1000 * 3600 * 24)

    const matchSearch = (
      item.aplikasi_premium?.nama_aplikasi?.toLowerCase().includes(search.toLowerCase()) ||
      item.nomor_telepon?.toLowerCase().includes(search.toLowerCase())
    )

    if (filterExpiring) {
      return matchSearch && diffDays <= 5 && diffDays >= 0
    }

    return matchSearch
  })

  const totalOrder = filteredData.reduce((acc, item) => acc + (item.jumlah_order || 0), 0)
  const totalBeli = filteredData.reduce((acc, item) => acc + (item.harga_beli || 0), 0)
  const totalJual = filteredData.reduce((acc, item) => acc + (item.harga_jual || 0), 0)

  const formatRupiah = (number) => {
    const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number)
    return formatted.replace(/,00$/, '')
  }

  const goTo = (path) => window.location.href = path
  const handleLogout = () => {
    supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleEdit = (id) => {
    alert(`Edit fitur untuk ID: ${id}`)
  }

  const handleDelete = async (id) => {
    const konfirmasi = confirm('Yakin ingin menghapus data ini?')
    if (!konfirmasi) return

    const { error } = await supabase.from('penjualan').delete().eq('id', id)
    if (!error) fetchData()
  }

  const Typewriter = ({ texts }) => {
    const [display, setDisplay] = useState('')
    const [loop, setLoop] = useState(0)
    const [charIdx, setCharIdx] = useState(0)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
      const current = texts[loop % texts.length]

      if (!deleting && charIdx < current.length) {
        const timeout = setTimeout(() => setCharIdx(charIdx + 1), 80)
        setDisplay(current.slice(0, charIdx + 1))
        return () => clearTimeout(timeout)
      }

      if (charIdx === current.length) {
        const timeout = setTimeout(() => setDeleting(true), 1400)
        return () => clearTimeout(timeout)
      }

      if (deleting && charIdx > 0) {
        const timeout = setTimeout(() => setCharIdx(charIdx - 1), 40)
        setDisplay(current.slice(0, charIdx - 1))
        return () => clearTimeout(timeout)
      }

      if (deleting && charIdx === 0) {
        setDeleting(false)
        setLoop(loop + 1)
      }
    }, [charIdx, deleting, loop, texts])

    return <span>{display}</span>
  }

  return (
    <div className="main-layout">
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
          <li onClick={() => goTo('/tambah')}>Tambah</li>
          <li className="active">History Pesanan</li>
          <li onClick={() => goTo('/setting')}>Setting</li>
        </ul>
        <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
      </aside>

      <div className="content">
        <div className="header">Halo kak FIKRI</div>
        <h2 className="judul">History Pesanan</h2>

        <div className="filter-bar">
        <input
            type="text"
            placeholder="Cari Aplikasi / No Telepon"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
        <button
            className="btn-mau-habis"
            onClick={() => setFilterExpiring(!filterExpiring)}
        >
            Mau Habis
        </button>
        </div>


        <div className="table-container">
          <table className="tabel-history">
            <thead>
              <tr>
                <th>Nama Aplikasi</th>
                <th>Jumlah Order</th>
                <th>Harga Beli</th>
                <th>Harga Jual</th>
                <th>Durasi</th>
                <th>Tanggal Mulai</th>
                <th>Tanggal Selesai</th>
                <th>Nomor Telepon</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => {
                const tanggalSelesai = new Date(item.tanggal_selesai)
                const now = new Date()
                const diff = (tanggalSelesai - now) / (1000 * 60 * 60 * 24)
                const isExpiringSoon = diff <= 5 && diff >= 0
                return (
                  <tr key={item.id} className={isExpiringSoon ? 'baris-mau-habis' : ''}>
                    <td>{item.aplikasi_premium?.nama_aplikasi || '-'}</td>
                    <td>{item.jumlah_order}</td>
                    <td>{formatRupiah(item.harga_beli)}</td>
                    <td>{formatRupiah(item.harga_jual)}</td>
                    <td>{item.durasi_total} {item.durasi_jenis}</td>
                    <td>{item.tanggal_mulai}</td>
                    <td>{item.tanggal_selesai}</td>
                    <td>{item.nomor_telepon}</td>
                    <td>
                      <div className="aksi-row">
                        <button className="btn-edit" onClick={() => handleEdit(item.id)}>Edit</button>
                        <button className="btn-hapus" onClick={() => handleDelete(item.id)}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td>{totalOrder}</td>
                <td>{formatRupiah(totalBeli)}</td>
                <td>{formatRupiah(totalJual)}</td>
                <td colSpan="5"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
