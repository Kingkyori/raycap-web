// FINAL PAGE.JSX TEROPTIMASI

'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import Modal from 'react-modal'
import 'cropperjs/dist/cropper.min.css'
import { Cropper } from 'react-cropper'
import './profil.css'

if (typeof window !== 'undefined') Modal.setAppElement('body')

export default function Profile() {
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ name: '', username: '', email: '', avatar_url: '', qris_url: '' })
  const [preview, setPreview] = useState('')
  const [qrisPreview, setQrisPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true) // Loading terpisah untuk initial load
  const [errorMsg, setErrorMsg] = useState('')
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImage, setCropImage] = useState(null)
  const [cropType, setCropType] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const cropperRef = useRef()
  const fileInput = useRef()
  const qrisInput = useRef()
  const router = useRouter()

  // Memoized refs untuk mencegah re-render
  const fileInputRef = useMemo(() => fileInput, [])
  const qrisInputRef = useMemo(() => qrisInput, [])

  // Optimized auth check dan fetch profile
  useEffect(() => {
    let mounted = true

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 600)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const fetchProfile = async () => {
      try {
        // Quick auth check
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          router.push('/login')
          return
        }

        if (!mounted) return
        setUser(session.user)

        // Fetch profile data secara parallel dengan memoization
        const { data: profileData, error: profileError } = await supabase
          .from('admins')
          .select('name, username, email, avatar_url, qris_url')
          .eq('id', session.user.id)
          .single()

        if (!mounted) return

        if (profileData && !profileError) {
          const formData = {
            name: profileData.name || '',
            username: profileData.username || '',
            email: profileData.email || session.user.email || '',
            avatar_url: profileData.avatar_url || '',
            qris_url: profileData.qris_url || ''
          }
          
          setForm(formData)
          setPreview(profileData.avatar_url || '')
          setQrisPreview(profileData.qris_url || '')
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        if (mounted) {
          setErrorMsg('Gagal memuat profil')
        }
      } finally {
        if (mounted) {
          setInitialLoading(false)
        }
      }
    }

    fetchProfile()

    return () => {
      mounted = false
      window.removeEventListener('resize', checkMobile)
    }
  }, [router])

  // Optimized form change handler dengan useCallback
  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }, [])

  // Optimized file choose handler
  const handleChooseFile = useCallback((e, type) => {
    const file = e.target.files[0]
    if (!file) return

    // Validasi file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File terlalu besar. Maksimal 5MB.')
      return
    }

    // Validasi file type
    if (!file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar.')
      return
    }

    setErrorMsg('')
    const reader = new FileReader()
    reader.onload = () => {
      setCropType(type)
      setCropImage(reader.result)
      // Delay untuk memastikan state terupdate
      setTimeout(() => setCropModalOpen(true), 50)
    }
    reader.readAsDataURL(file)
  }, [])

  // Optimized delete old file dengan error handling
  const deleteOldFile = useCallback(async (type) => {
    try {
      const fileUrl = type === 'avatar' ? form.avatar_url : form.qris_url
      if (!fileUrl) return

      const filePath = fileUrl.split('/storage/v1/object/public/')[1]?.split('?')[0]
      if (!filePath) return

      await supabase.storage
        .from(type === 'avatar' ? 'avatars' : 'qris')
        .remove([filePath])
    } catch (error) {
      console.warn('Failed to delete old file:', error)
      // Don't throw error, just log warning
    }
  }, [form.avatar_url, form.qris_url])

  // Optimized save cropped dengan better error handling
  const saveCropped = useCallback(async () => {
    if (!user || !cropType) return

    setLoading(true)
    setErrorMsg('')
    
    try {
      const cropper = cropperRef.current?.cropper
      if (!cropper) throw new Error('Cropper tidak tersedia')

      // Get crop data untuk menentukan ukuran optimal
      const cropData = cropper.getCropBoxData()
      const canvasData = cropper.getCanvasData()
      
      // Tentukan ukuran berdasarkan type dan crop area
      let canvasWidth, canvasHeight
      
      if (cropType === 'avatar') {
        // Avatar tetap kotak 300x300
        canvasWidth = 300
        canvasHeight = 300
      } else {
        // QRIS: pertahankan aspect ratio dari crop area, max 800px
        const aspectRatio = cropData.width / cropData.height
        const maxSize = 800
        
        if (aspectRatio >= 1) {
          // Landscape atau square
          canvasWidth = Math.min(maxSize, cropData.width * 2)
          canvasHeight = canvasWidth / aspectRatio
        } else {
          // Portrait
          canvasHeight = Math.min(maxSize, cropData.height * 2)
          canvasWidth = canvasHeight * aspectRatio
        }
        
        // Ensure minimum size
        canvasWidth = Math.max(200, Math.round(canvasWidth))
        canvasHeight = Math.max(200, Math.round(canvasHeight))
      }

      const canvas = cropper.getCroppedCanvas({
        width: canvasWidth,
        height: canvasHeight,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      })
      
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Gagal membuat blob'))
        }, 'image/webp', 0.8) // WebP format untuk size lebih kecil
      })

      const timestamp = Date.now()
      const file = new File([blob], `${cropType}-${timestamp}.webp`, { type: 'image/webp' })
      const filePath = `${cropType}-${user.id}-${timestamp}.webp`
      const bucket = cropType === 'avatar' ? 'avatars' : 'qris'

      // Delete old file secara parallel
      const deletePromise = deleteOldFile(cropType)
      
      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`)

      // Wait for delete to complete
      await deletePromise

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
      const publicUrl = `${urlData?.publicUrl}?t=${timestamp}`
      
      // Update database
      const updateField = cropType === 'avatar' ? { avatar_url: publicUrl } : { qris_url: publicUrl }
      const { error: updateError } = await supabase
        .from('admins')
        .update(updateField)
        .eq('id', user.id)

      if (updateError) throw new Error(`Update database gagal: ${updateError.message}`)

      // Update state
      if (cropType === 'avatar') {
        setForm(f => ({ ...f, avatar_url: publicUrl }))
        setPreview(publicUrl)
      } else {
        setForm(f => ({ ...f, qris_url: publicUrl }))
        setQrisPreview(publicUrl)
      }

      setCropModalOpen(false)
      setCropImage(null)
      
    } catch (error) {
      console.error('Save cropped error:', error)
      setErrorMsg(error.message || 'Terjadi kesalahan saat menyimpan gambar')
    } finally {
      setLoading(false)
    }
  }, [user, cropType, deleteOldFile])

  // Optimized delete handler
  const handleDelete = useCallback(async (type) => {
    if (!user) return

    const confirmDelete = confirm(`Yakin ingin menghapus ${type === 'avatar' ? 'foto profil' : 'QRIS'}?`)
    if (!confirmDelete) return

    setLoading(true)
    try {
      await deleteOldFile(type)
      
      const field = type === 'avatar' ? 'avatar_url' : 'qris_url'
      const { error } = await supabase
        .from('admins')
        .update({ [field]: null })
        .eq('id', user.id)

      if (error) throw error

      if (type === 'avatar') {
        setForm(f => ({ ...f, avatar_url: '' }))
        setPreview('')
      } else {
        setForm(f => ({ ...f, qris_url: '' }))
        setQrisPreview('')
      }
    } catch (error) {
      console.error('Delete error:', error)
      setErrorMsg(`Gagal menghapus ${type === 'avatar' ? 'foto profil' : 'QRIS'}`)
    } finally {
      setLoading(false)
    }
  }, [user, deleteOldFile])

  // Optimized save profile handler
  const handleSave = useCallback(async (e) => {
    e.preventDefault()
    
    if (!form.name.trim() || !form.username.trim()) {
      setErrorMsg('Nama dan Username tidak boleh kosong.')
      return
    }

    if (!user) return

    setLoading(true)
    setErrorMsg('')
    
    try {
      const { error } = await supabase
        .from('admins')
        .update({ 
          name: form.name.trim(), 
          username: form.username.trim() 
        })
        .eq('id', user.id)

      if (error) throw error
      
      alert('✅ Profil berhasil diperbarui')
    } catch (error) {
      console.error('Save profile error:', error)
      setErrorMsg('Gagal menyimpan profil')
    } finally {
      setLoading(false)
    }
  }, [form.name, form.username, user])

  // Optimized modal close handler
  const closeModal = useCallback(() => {
    setCropModalOpen(false)
    setCropImage(null)
    setErrorMsg('')
  }, [])

  // Loading state yang lebih cepat
  if (initialLoading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <div>Memuat profil...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="profile-container">
        <div className="profile-error">Gagal memuat profil</div>
      </div>
    )
  }

  return (
    <div className="profile-container">
      {/* Back button */}
      <div className="profile-back-section">
        <button 
          onClick={() => router.back()} 
          className="profile-back-btn"
          disabled={loading}
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M15 18L9 12L15 6" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          Kembali
        </button>
      </div>
      
      <div className="profile-title">Edit Profil</div>
      
      {/* Error message */}
      {errorMsg && (
        <div className="error-message" style={{ marginBottom: '20px', padding: '10px', background: '#fee', color: '#c00', borderRadius: '5px' }}>
          {errorMsg}
        </div>
      )}

      <div className="profile-avatar-section">
        {preview ? (
          <img 
            src={preview} 
            alt="Avatar" 
            className="profile-avatar-img"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none'
              setPreview('')
            }}
          />
        ) : (
          <div className="avatar-placeholder">Tidak ada foto</div>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={(e) => handleChooseFile(e, 'avatar')} 
        />
        
        <button 
          onClick={() => preview ? handleDelete('avatar') : fileInputRef.current?.click()} 
          className="profile-avatar-btn" 
          disabled={loading}
        >
          {loading ? 'Memproses...' : preview ? 'Hapus Foto Profil' : 'Upload Foto Profil'}
        </button>
      </div>

      <form onSubmit={handleSave} className="profile-form">
        <label className="profile-label">Nama</label>
        <input 
          name="name" 
          value={form.name} 
          onChange={handleChange} 
          className="profile-input"
          disabled={loading}
          maxLength={50}
        />

        <label className="profile-label">Username</label>
        <input 
          name="username" 
          value={form.username} 
          onChange={handleChange} 
          className="profile-input"
          disabled={loading}
          maxLength={30}
        />

        <label className="profile-label">Email</label>
        <input 
          value={form.email} 
          className="profile-input" 
          disabled 
        />

        <button 
          type="submit" 
          className="profile-save-btn" 
          disabled={loading}
        >
          {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>

      <div className="profile-avatar-section" style={{ marginTop: 30 }}>
        <div className="profile-subtitle">Upload QRIS</div>
        
        {qrisPreview && (
          <img 
            src={qrisPreview} 
            alt="QRIS" 
            className="profile-qris-img"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none'
              setQrisPreview('')
            }}
          />
        )}
        
        <input 
          type="file" 
          ref={qrisInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={(e) => handleChooseFile(e, 'qris')} 
        />
        
        <button 
          onClick={() => qrisPreview ? handleDelete('qris') : qrisInputRef.current?.click()} 
          className="profile-avatar-btn" 
          disabled={loading}
        >
          {loading ? 'Memproses...' : qrisPreview ? 'Hapus QRIS' : 'Upload QRIS'}
        </button>
      </div>

      <Modal
        isOpen={cropModalOpen}
        onRequestClose={closeModal}
        contentLabel="Crop Image"
        ariaHideApp={false}
        style={{
          overlay: { 
            zIndex: 9999, 
            backgroundColor: 'rgba(0,0,0,0.75)',
            padding: isMobile ? '5px' : '10px',
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'center'
          },
          content: {
            width: isMobile ? '100%' : '95%', 
            maxWidth: isMobile ? 'none' : '550px', 
            height: isMobile ? '100vh' : 'auto',
            maxHeight: isMobile ? '100vh' : '95vh',
            margin: isMobile ? '0' : 'auto', 
            borderRadius: isMobile ? 0 : 16, 
            padding: isMobile ? '10px' : 24, 
            border: 'none',
            overflow: 'auto',
            background: 'linear-gradient(135deg, #ffffff 0%, #fafbff 100%)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            inset: isMobile ? '0' : 'auto'
          }
        }}
      >
        <div className="crop-modal-header">
          <h3 className="crop-modal-title">
            Crop {cropType === 'avatar' ? 'Foto Profil' : 'QRIS'}
          </h3>
        </div>
        
        <div className="crop-modal-body">
          <div className="crop-instructions">
            <strong>Panduan Crop {cropType === 'avatar' ? 'Foto Profil' : 'QRIS'}:</strong><br/>
            • Drag untuk memindahkan area crop<br/>
            • Gunakan titik-titik sudut untuk resize<br/>
            {cropType === 'avatar' ? (
              <>• Crop akan otomatis berbentuk kotak (1:1)<br/>
              • Pastikan wajah berada di tengah kotak biru</>
            ) : (
              <>• Crop bebas sesuai kebutuhan (tidak harus kotak)<br/>
              • Sesuaikan area crop dengan ukuran QRIS yang diinginkan</>
            )}
          </div>
          
          {cropImage && (
            <Cropper
              src={cropImage}
              style={{ 
                height: isMobile ? 250 : 320, 
                width: '100%', 
                marginBottom: '15px',
                borderRadius: isMobile ? '8px' : '12px',
                overflow: 'hidden'
              }}
              guides={true}
              ref={cropperRef}
              viewMode={1}
              dragMode="move"
              autoCropArea={isMobile ? 0.95 : 0.75}
              background={false}
              responsive={true}
              checkOrientation={false}
              aspectRatio={cropType === 'avatar' ? 1 : 0} // Avatar kotak (1:1), QRIS bebas (0 = free aspect)
              cropBoxMovable={true}
              cropBoxResizable={true}
              toggleDragModeOnDblclick={false}
              zoomable={true}
              scalable={true}
              rotatable={false}
              minCropBoxHeight={30}
              minCropBoxWidth={30}
            />
          )}
        </div>
        
        {errorMsg && (
          <div className="error-message">
            {errorMsg}
          </div>
        )}
        
        <div className="modal-buttons">
          <button 
            onClick={closeModal} 
            disabled={loading}
            className="cancel-btn"
          >
            Batal
          </button>
          <button 
            onClick={saveCropped} 
            className={`save-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </Modal>
    </div>
  )
}