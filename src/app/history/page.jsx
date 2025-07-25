'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import '../dashboard/dashboard.css'
import './history.css'

// Memoized Typewriter component untuk menghindari re-render
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

export default function HistoryPage() {
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [filterExpiring, setFilterExpiring] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [editModal, setEditModal] = useState(false)
  const [editData, setEditData] = useState(null)
  const [editForm, setEditForm] = useState({
    jumlah_order: '',
    harga_beli: '',
    harga_jual: '',
    durasi_total: '',
    durasi_jenis: 'hari',
    tanggal_mulai: '',
    tanggal_selesai: '',
    nomor_telepon: '',
    note: ''
  })
  const [aplikasiList, setAplikasiList] = useState([])
  const router = useRouter()

  // Memoized constants
  const teksAnimasi = useMemo(() => ['Selamat datang kembali, Admin'], [])
  const avatarSrc = useMemo(() => '/globe.svg', [])

  // Memoized format function
  const formatRupiah = useCallback((number) => {
    const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number)
    return formatted.replace(/,00$/, '')
  }, [])

  // Optimized navigation with useRouter
  const goTo = useCallback((path) => {
    router.push(path)
  }, [router])

  // Optimized logout function
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  // Auth check dan fetch data yang dioptimasi
  useEffect(() => {
    let mounted = true

    const initializePage = async () => {
      try {
        // Check auth terlebih dahulu
        const { data: session } = await supabase.auth.getSession()
        
        if (!session.session) {
          router.push('/login')
          return
        }

        if (!mounted) return
        setUser(session.session.user)

        // Get admin data untuk mendapatkan ID admin
        const email = session.session.user.email
        
        const { data: admin, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('email', email)
          .single()

        if (!admin) {
          if (mounted) {
            setErrorMsg('Admin tidak ditemukan')
            setLoading(false)
          }
          return
        }

        if (!mounted) return
        setProfile(admin)

        // Fetch penjualan data dengan join ke aplikasi_premium
        const { data: penjualanData, error } = await supabase
          .from('penjualan')
          .select('*, aplikasi_premium(nama_aplikasi)')
          .eq('user_id', admin.id)
          .order('created_at', { ascending: false })

        if (!mounted) return

        if (penjualanData && !error) {
          setData(penjualanData)
        } else {
          console.error('Error fetching penjualan data:', error)
          setData([])
        }

        // Fetch aplikasi list untuk dropdown edit
        const { data: aplikasiData } = await supabase
          .from('aplikasi_premium')
          .select('id, nama_aplikasi')
          .order('nama_aplikasi')
        
        if (aplikasiData) {
          setAplikasiList(aplikasiData)
        }
      } catch (error) {
        console.error('Error loading history:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initializePage()

    return () => {
      mounted = false
    }
  }, [router])

  // Memoized filtered data untuk menghindari kalkulasi berulang
  const filteredData = useMemo(() => {
    if (!data.length) return []
    
    return data.filter(item => {
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
  }, [data, search, filterExpiring])

  // Memoized totals untuk menghindari kalkulasi berulang
  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => ({
      totalOrder: acc.totalOrder + (item.jumlah_order || 0),
      totalBeli: acc.totalBeli + (item.harga_beli || 0),
      totalJual: acc.totalJual + (item.harga_jual || 0)
    }), { totalOrder: 0, totalBeli: 0, totalJual: 0 })
  }, [filteredData])

  // Optimized edit handler
  const handleEdit = useCallback((id) => {
    const item = data.find(d => d.id === id)
    if (!item) return
    
    setEditData(item)
    setEditForm({
      jumlah_order: item.jumlah_order || '',
      harga_beli: item.harga_beli || '',
      harga_jual: item.harga_jual || '',
      durasi_total: item.durasi_total || '',
      durasi_jenis: item.durasi_jenis || 'hari',
      tanggal_mulai: item.tanggal_mulai || '',
      tanggal_selesai: item.tanggal_selesai || '',
      nomor_telepon: item.nomor_telepon || '',
      note: item.note || '',
      aplikasi_id: item.aplikasi_id || ''
    })
    setEditModal(true)
  }, [data])

  // Handle form change
  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }))
  }, [])

  // Handle save edit
  const handleSaveEdit = useCallback(async () => {
    if (!editData) return
    
    try {
      setLoading(true)
      
      const updateData = {
        jumlah_order: parseInt(editForm.jumlah_order) || 0,
        harga_beli: parseInt(editForm.harga_beli) || 0,
        harga_jual: parseInt(editForm.harga_jual) || 0,
        durasi_total: parseInt(editForm.durasi_total) || 0,
        durasi_jenis: editForm.durasi_jenis,
        tanggal_mulai: editForm.tanggal_mulai,
        tanggal_selesai: editForm.tanggal_selesai,
        nomor_telepon: editForm.nomor_telepon,
        note: editForm.note,
        aplikasi_id: editForm.aplikasi_id
      }

      const { error } = await supabase
        .from('penjualan')
        .update(updateData)
        .eq('id', editData.id)

      if (!error) {
        // Update data di state
        setData(prevData => 
          prevData.map(item => 
            item.id === editData.id 
              ? { 
                  ...item, 
                  ...updateData,
                  aplikasi_premium: aplikasiList.find(app => app.id === editForm.aplikasi_id)
                }
              : item
          )
        )
        setEditModal(false)
        alert('✅ Data berhasil diupdate!')
      } else {
        alert('❌ Gagal mengupdate data')
      }
    } catch (error) {
      console.error('Error updating:', error)
      alert('❌ Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }, [editData, editForm, aplikasiList])

  // Close modal
  const closeEditModal = useCallback(() => {
    setEditModal(false)
    setEditData(null)
    setEditForm({
      jumlah_order: '',
      harga_beli: '',
      harga_jual: '',
      durasi_total: '',
      durasi_jenis: 'hari',
      tanggal_mulai: '',
      tanggal_selesai: '',
      nomor_telepon: '',
      note: '',
      aplikasi_id: ''
    })
  }, [])

  // Sementara hard delete dulu sampai masalah data fixed
  const handleDelete = useCallback(async (id) => {
    const konfirmasi = confirm('Yakin ingin menghapus data ini?')
    if (!konfirmasi) return

    try {
      // Hard delete sementara
      const { error } = await supabase
        .from('penjualan')
        .delete()
        .eq('id', id)
      
      if (!error) {
        // Update state langsung - hilangkan dari tampilan
        setData(prevData => prevData.filter(item => item.id !== id))
        alert('✅ Data berhasil dihapus')
      } else {
        alert('❌ Gagal menghapus data')
        console.error('Error deleting data:', error)
      }
    } catch (error) {
      console.error('Error deleting data:', error)
      alert('❌ Terjadi kesalahan saat menghapus data')
    }
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="main-layout">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div>Loading History...</div>
        </div>
      </div>
    )
  }

  // Tidak ada user, redirect
  if (!user) return null

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
        </ul>
        <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
      </aside>

      <div className="content">
        <div className="header">Halo kak {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin'}</div>
        <h2 className="judul">History Pesanan</h2>

        <div className="filter-bar">
          <input
            type="text"
            placeholder="Cari Aplikasi / No Telepon"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className={`btn-mau-habis ${filterExpiring ? 'active' : ''}`}
            onClick={() => setFilterExpiring(!filterExpiring)}
          >
            Mau Habis
          </button>
        </div>

        <div className="table-container">
          {/* Debug info */}
          <div style={{ padding: '10px', background: '#f0f0f0', marginBottom: '10px', fontSize: '12px' }}>
            Debug: Total data = {data.length}, Filtered data = {filteredData.length}
          </div>
          
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
                <th>Catatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    {data.length === 0 ? 'Belum ada data penjualan' : 'Tidak ada data yang sesuai dengan pencarian'}
                  </td>
                </tr>
              ) : (
                filteredData.map(item => {
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
                      <td className="catatan-cell">
                        {item.note ? (
                          <span title={item.note}>
                            {item.note.length > 30 ? item.note.substring(0, 30) + '...' : item.note}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <div className="aksi-row">
                          <button className="btn-edit" onClick={() => handleEdit(item.id)}>Edit</button>
                          <button className="btn-hapus" onClick={() => handleDelete(item.id)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td>{totals.totalOrder}</td>
                <td>{formatRupiah(totals.totalBeli)}</td>
                <td>{formatRupiah(totals.totalJual)}</td>
                <td colSpan="6"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal Edit */}
      {editModal && (
        <div className="edit-modal-overlay" onClick={closeEditModal}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Edit Data Penjualan</h3>
              <button className="close-btn" onClick={closeEditModal}>×</button>
            </div>
            
            <div className="edit-modal-body">
              <div className="form-row">
                <label>Aplikasi:</label>
                <select 
                  name="aplikasi_id" 
                  value={editForm.aplikasi_id} 
                  onChange={handleFormChange}
                  className="form-input"
                >
                  <option value="">Pilih Aplikasi</option>
                  {aplikasiList.map(app => (
                    <option key={app.id} value={app.id}>{app.nama_aplikasi}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>Jumlah Order:</label>
                <input 
                  type="number" 
                  name="jumlah_order" 
                  value={editForm.jumlah_order} 
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <label>Harga Beli:</label>
                <input 
                  type="number" 
                  name="harga_beli" 
                  value={editForm.harga_beli} 
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <label>Harga Jual:</label>
                <input 
                  type="number" 
                  name="harga_jual" 
                  value={editForm.harga_jual} 
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <label>Durasi:</label>
                <div className="form-group">
                  <input 
                    type="number" 
                    name="durasi_total" 
                    value={editForm.durasi_total} 
                    onChange={handleFormChange}
                    className="form-input duration-input"
                  />
                  <select 
                    name="durasi_jenis" 
                    value={editForm.durasi_jenis} 
                    onChange={handleFormChange}
                    className="form-input duration-select"
                  >
                    <option value="hari">Hari</option>
                    <option value="minggu">Minggu</option>
                    <option value="bulan">Bulan</option>
                    <option value="tahun">Tahun</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label>Tanggal Mulai:</label>
                <input 
                  type="date" 
                  name="tanggal_mulai" 
                  value={editForm.tanggal_mulai} 
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <label>Tanggal Selesai:</label>
                <input 
                  type="date" 
                  name="tanggal_selesai" 
                  value={editForm.tanggal_selesai} 
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <label>Nomor Telepon:</label>
                <input 
                  type="tel" 
                  name="nomor_telepon" 
                  value={editForm.nomor_telepon} 
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <label>Catatan:</label>
                <textarea 
                  name="note" 
                  value={editForm.note} 
                  onChange={handleFormChange}
                  className="form-input form-textarea"
                  rows="3"
                  placeholder="Tambahkan catatan..."
                />
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="btn-cancel" onClick={closeEditModal}>Batal</button>
              <button className="btn-save" onClick={handleSaveEdit} disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
