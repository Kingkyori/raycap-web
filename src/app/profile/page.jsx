'use client'
import { useEffect, useState, useRef } from "react"
import { supabase } from '../../lib/supabaseClient'
import './profil.css'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ name:'', username:'', email:'', avatar_url:'' })
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInput = useRef()

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return window.location.href = "/login"
      setUser(session.user)
      const { data } = await supabase
        .from('admins')
        .select('name, username, email, avatar_url')
        .eq('id', session.user.id)
        .single()
      if (data) setForm(data)
      if (data?.avatar_url) setPreview(data.avatar_url)
    }
    getData()
  }, [])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleFile = async e => {
    const file = e.target.files[0]
    if (!file || !user) return
    setLoading(true)
    const ext = file.name.split('.').pop()
    const filePath = `avatar-${user.id}.${ext}`
    let { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })
    if (error) { setLoading(false); return alert("Gagal upload!") }
    // Ambil url publiknya
    const { data: { publicUrl } } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(filePath)
    setForm(f => ({ ...f, avatar_url: publicUrl }))
    setPreview(publicUrl)
    await supabase.from('admins').update({ avatar_url: publicUrl }).eq('id', user.id)
    setLoading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('admins')
      .update({ name: form.name, username: form.username })
      .eq('id', user.id)
    setLoading(false)
    if (!error) alert('Profil berhasil diupdate')
  }

  if (!user) return <div style={{textAlign:'center', marginTop:80}}>Loading...</div>

  return (
    <div className="profile-container">
      <div className="profile-title">Edit Profil</div>
      <div className="profile-avatar-section">
        <img
          src={preview || "/default-avatar.png"}
          alt="Avatar"
          className="profile-avatar-img"
        />
        <input
          type="file"
          ref={fileInput}
          style={{display:'none'}}
          accept="image/*"
          onChange={handleFile}
        />
        <button className="profile-avatar-btn" onClick={()=>fileInput.current.click()} disabled={loading}>
          {loading ? "Mengupload..." : "Ganti Foto Profil"}
        </button>
      </div>
      <form onSubmit={handleSave} className="profile-form">
        <label className="profile-label">Nama</label>
        <input name="name" value={form.name} className="profile-input" onChange={handleChange} autoComplete="off" />

        <label className="profile-label">Username</label>
        <input name="username" value={form.username} className="profile-input" onChange={handleChange} autoComplete="off" />

        <label className="profile-label">Email</label>
        <input value={form.email} className="profile-input" disabled />

        <button type="submit" className="profile-save-btn" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  )
}
