'use client'
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import "./regist.css";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: ''
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      // Validasi input
      if (!form.name || !form.username || !form.email || !form.password) {
        setMsg("Semua field harus diisi!");
        return;
      }

      if (form.password.length < 6) {
        setMsg("Password minimal 6 karakter!");
        return;
      }

      if (!form.email.includes('@')) {
        setMsg("Format email tidak valid!");
        return;
      }

      // 1. Cek username/email di tabel admins
      const { data: userCheck, error: checkError } = await supabase
        .from('admins')
        .select('id')
        .or(`username.eq.${form.username.trim()},email.eq.${form.email.trim()}`);
        
      if (checkError) {
        setMsg("Database error: " + checkError.message);
        return;
      }
      
      if (userCheck && userCheck.length > 0) {
        setMsg("Username atau email sudah digunakan!");
        return;
      }

      // 2. Daftar ke Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          setMsg("Email sudah terdaftar di sistem!");
        } else {
          setMsg("Auth error: " + authError.message);
        }
        return;
      }

      // 3. Insert ke tabel admins (pakai user.id dari Auth)
      let userId = data.user?.id || data.session?.user?.id;
      if (!userId) {
        setMsg("Tidak dapat mengambil user ID dari hasil signup!");
        return;
      }

      const { error: insertError } = await supabase
        .from('admins')
        .insert([{
          id: userId,
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          created_at: new Date().toISOString(),
        }]);

      if (insertError) {
        setMsg("Database error: " + insertError.message);
        return;
      }

      setMsg("Berhasil daftar! Silakan kembali ke halaman login.");
      setTimeout(() => window.location.href = "/login", 2000);

    } catch (err) {
      console.error('Register error:', err);
      setMsg("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-bg">
      <div className="register-card">
        <div className="icon-box"><span role="img" aria-label="user">👤</span></div>
        <h2 className="register-title">Create your account</h2>
        <p className="register-subtitle">Daftar akun admin untuk akses dashboard.</p>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="input-box">
            <input
              name="name"
              type="text"
              placeholder="Nama Lengkap"
              value={form.name}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>
          <div className="input-box">
            <input
              name="username"
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>
          <div className="input-box">
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>
          <div className="input-box">
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>
          <button type="submit" className="register-btn" disabled={loading}>
            {loading ? "Loading..." : "Register"}
          </button>
        </form>
        {msg && <div className="register-msg">{msg}</div>}
        <div className="register-or">
          <span>Sudah punya akun? <a href="/login">Login</a></span>
        </div>
      </div>
    </div>
  );
}
