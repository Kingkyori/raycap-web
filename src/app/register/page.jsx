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

    // 1. Cek username/email di tabel admins
    const { data: userCheck, error: checkError } = await supabase
      .from('admins')
      .select('id')
      .or(`username.eq.${form.username},email.eq.${form.email}`);
    if (checkError) {
      setMsg("Supabase error: " + checkError.message);
      setLoading(false);
      console.error("Supabase SELECT error:", checkError);
      return;
    }
    if (userCheck && userCheck.length > 0) {
      setMsg("Username/email sudah dipakai!");
      setLoading(false);
      return;
    }

    // 2. Daftar ke Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      setMsg("Auth error: " + authError.message);
      setLoading(false);
      console.error("Supabase AUTH error:", authError);
      return;
    }

    // 3. Insert ke tabel admins (pakai user.id dari Auth)
    let userId = data.user?.id || data.session?.user?.id;
    if (!userId) {
      setMsg("Tidak dapat mengambil user ID dari hasil signup!");
      setLoading(false);
      console.error("Auth response, no userId:", data);
      return;
    }

    const { error: insertError } = await supabase
      .from('admins')
      .insert([{
        id: userId,
        name: form.name,
        username: form.username,
        email: form.email,
        created_at: new Date().toISOString(),
      }]);

    if (insertError) {
      setMsg("Database error: " + insertError.message);
      setLoading(false);
      console.error("Supabase INSERT error:", insertError);
      return;
    }

    setMsg("Berhasil daftar! Silakan cek email untuk verifikasi akun.");
    setLoading(false);

    setTimeout(() => window.location.href = "/login", 2000);
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
