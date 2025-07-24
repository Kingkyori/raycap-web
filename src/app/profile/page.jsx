// FINAL PAGE.JSX TEROPTIMASI

'use client'

import { useEffect, useState, useRef } from 'react'
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
  const [errorMsg, setErrorMsg] = useState('')
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImage, setCropImage] = useState(null)
  const [cropType, setCropType] = useState('')
  const cropperRef = useRef()

  const fileInput = useRef()
  const qrisInput = useRef()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return window.location.href = "/login"
      setUser(session.user)
      const { data } = await supabase.from('admins').select('*').eq('id', session.user.id).single()
      if (data) {
        setForm(data)
        setPreview(data.avatar_url || '')
        setQrisPreview(data.qris_url || '')
      }
    }
    fetchProfile()
  }, [])

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleChooseFile = (e, type) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCropType(type)
      setCropImage(reader.result)
      setTimeout(() => setCropModalOpen(true), 100)
    }
    reader.readAsDataURL(file)
  }

  const deleteOldFile = async (type) => {
    const fileUrl = type === 'avatar' ? form.avatar_url : form.qris_url
    if (!fileUrl) return
    const filePath = fileUrl.split('/storage/v1/object/public/')[1].split('?')[0]
    await supabase.storage.from(type === 'avatar' ? 'avatars' : 'qris').remove([filePath])
  }

  const saveCropped = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const cropper = cropperRef.current?.cropper
      const canvas = cropper.getCroppedCanvas()
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      const file = new File([blob], 'cropped.png', { type: 'image/png' })

      const filePath = `${cropType}-${user.id}.png`
      const bucket = cropType === 'avatar' ? 'avatars' : 'qris'
      await deleteOldFile(cropType)
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true })
      if (uploadError) throw new Error("Upload ke storage gagal.")

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
      const publicUrl = `${urlData?.publicUrl}?t=${Date.now()}`
      const updateField = cropType === 'avatar' ? { avatar_url: publicUrl } : { qris_url: publicUrl }
      const { error: updateError } = await supabase.from('admins').update(updateField).eq('id', user.id)
      if (updateError) throw new Error("Gagal update ke database.")

      if (cropType === 'avatar') {
        setForm(f => ({ ...f, avatar_url: publicUrl }))
        setPreview(publicUrl)
      } else {
        setForm(f => ({ ...f, qris_url: publicUrl }))
        setQrisPreview(publicUrl)
      }

      setCropModalOpen(false)
    } catch (err) {
      setErrorMsg(err.message || "Terjadi kesalahan saat crop.")
    }
    setLoading(false)
  }

  const handleDelete = async (type) => {
    await deleteOldFile(type)
    const field = type === 'avatar' ? 'avatar_url' : 'qris_url'
    await supabase.from('admins').update({ [field]: null }).eq('id', user.id)
    if (type === 'avatar') {
      setForm(f => ({ ...f, avatar_url: null }))
      setPreview('')
    } else {
      setForm(f => ({ ...f, qris_url: null }))
      setQrisPreview('')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.username.trim()) {
      alert("Nama dan Username tidak boleh kosong.")
      return
    }
    setLoading(true)
    await supabase.from('admins').update({ name: form.name, username: form.username }).eq('id', user.id)
    setLoading(false)
    alert('✅ Profil berhasil diperbarui')
  }

  if (!user) return <div className="loading-text">Loading...</div>

  return (
    <div className="profile-container">
      <div className="profile-title">Edit Profil</div>
      <div className="profile-avatar-section">
        {preview ? <img src={preview} alt="Avatar" className="profile-avatar-img" /> : <div className="avatar-placeholder">Tidak ada foto</div>}
        <input type="file" ref={fileInput} style={{ display: 'none' }} accept="image/*" onChange={e => handleChooseFile(e, 'avatar')} />
        <button onClick={() => preview ? handleDelete('avatar') : fileInput.current.click()} className="profile-avatar-btn" disabled={loading}>
          {preview ? 'Hapus Foto Profil' : 'Upload Foto Profil'}
        </button>
      </div>

      <form onSubmit={handleSave} className="profile-form">
        <label className="profile-label">Nama</label>
        <input name="name" value={form.name} onChange={handleChange} className="profile-input" />

        <label className="profile-label">Username</label>
        <input name="username" value={form.username} onChange={handleChange} className="profile-input" />

        <label className="profile-label">Email</label>
        <input value={form.email} className="profile-input" disabled />

        <button type="submit" className="profile-save-btn" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
      </form>

      <div className="profile-avatar-section" style={{ marginTop: 30 }}>
        <div className="profile-subtitle">Upload QRIS</div>
        {qrisPreview && <img src={qrisPreview} alt="QRIS" className="profile-qris-img" />}
        <input type="file" ref={qrisInput} style={{ display: 'none' }} accept="image/*" onChange={e => handleChooseFile(e, 'qris')} />
        <button onClick={() => qrisPreview ? handleDelete('qris') : qrisInput.current.click()} className="profile-avatar-btn" disabled={loading}>
          {qrisPreview ? 'Hapus QRIS' : 'Upload QRIS'}
        </button>
      </div>

      <Modal
        isOpen={cropModalOpen}
        onRequestClose={() => setCropModalOpen(false)}
        contentLabel="Crop Image"
        ariaHideApp={false}
        style={{
          overlay: { zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)' },
          content: {
            width: '90%', maxWidth: 500, margin: 'auto', borderRadius: 20, padding: 20, height: 500
          }
        }}
      >
        {cropImage && (
          <Cropper
            src={cropImage}
            style={{ height: 350, width: '100%' }}
            guides={true}
            ref={cropperRef}
            viewMode={1}
            dragMode="move"
            autoCropArea={1}
            background={false}
          />
        )}
        {errorMsg && <div className="error-message">{errorMsg}</div>}
        <div className="modal-buttons">
          <button onClick={saveCropped} className="profile-avatar-btn" disabled={loading}>Simpan</button>
          <button onClick={() => setCropModalOpen(false)} disabled={loading}>Batal</button>
        </div>
      </Modal>
    </div>
  )
}