'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient' // perbaikan path dan ekspor

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkLogin = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard') // redirect ke dashboard
      } else {
        router.replace('/login') // redirect ke login jika belum
      }
    }
    checkLogin()
  }, [router])

  return null
}
