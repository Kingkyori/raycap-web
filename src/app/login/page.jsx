'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import './login.css'

export default function LoginCard() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const router = useRouter()

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setMsg('')
    setLoading(true)

    // Cek login via email atau username
    let email = form.username
    if (!email.includes('@')) {
      setMsg('Gunakan email untuk login')
      setLoading(false)
      return
    }
    // Supabase login
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: form.password,
    })

    setLoading(false)
    if (error) {
      setMsg('Email atau password salah!')
    } else {
      setMsg('Berhasil login!')
      setTimeout(() => {
        router.push('/dashboard')
      }, 800) // Biar notif sempat kelihatan
    }
  }

  // FUNGSI FORGOT PASSWORD (kirim email reset)
  const handleForgot = async (e) => {
    e.preventDefault()
    setForgotMsg('')
    if (!forgotEmail) return setForgotMsg('Masukkan email anda!')
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: 'http://localhost:3000/reset-password' // ganti ke domain kamu di production
    })
    if (error) setForgotMsg(error.message)
    else setForgotMsg('Link reset password telah dikirim ke email Anda.')
  }

  return (
    <div className="login-bg">
      <div className="glass-card">
        <div className="icon-box-login">
          <span className="icon-login-login">🔑</span>
        </div>
        <h2 className="login-title">Sign in with email</h2>
        <p className="login-subtitle">
          Masuk untuk mengakses dashboard.<br />Gratis untuk admin.
        </p>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="input-box">
            <input
              type="text"
              name="username"
              placeholder="Email"
              value={form.username}
              onChange={handleChange}
              autoFocus
              required
            />
          </div>
          <div className="input-box">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <button className="login-btn" disabled={loading} type="submit">
            {loading ? 'Loading...' : 'Get Started'}
          </button>
        </form>
        {/* Notifikasi berhasil/gagal */}
        {msg && (
          <div className={`notif-msg ${msg === 'Berhasil login!' ? 'success' : 'error'}`}>
            {msg}
          </div>
        )}
        <div className="or">
          <span>Belum punya akun? <a href="/register">Register</a></span>
        </div>

        {/* Forgot Password PopUp/Box */}
        {showForgot && (
          <div className="forgot-popup">
            <form onSubmit={handleForgot} style={{ marginTop: 16 }}>
              <input
                type="email"
                placeholder="Masukkan email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <button className="login-btn" type="submit" style={{ width: '100%', marginTop: 0 }}>Kirim Link Reset</button>
              {forgotMsg && (
                <div style={{ marginTop: 8, color: forgotMsg.includes('dikirim') ? 'green' : 'red', fontSize: 14 }}>
                  {forgotMsg}
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
