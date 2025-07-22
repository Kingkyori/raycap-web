// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lzhvjlhrjuwwpoatyyzg.supabase.co' // dari API Supabase
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aHZqbGhyanV3d3BvYXR5eXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTYwNzQsImV4cCI6MjA2ODc3MjA3NH0.mWteqxB0VfeeGXhP7-VSmK-iyHDUNZzdQGeG1pRUNpM' // dari Supabase > Settings > API

export const supabase = createClient(supabaseUrl, supabaseKey)
