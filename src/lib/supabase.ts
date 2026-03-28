import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uwdfytuvpujhiniotqyl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZGZ5dHV2cHVqaGluaW90cXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MDg2ODAsImV4cCI6MjA5MDE4NDY4MH0.ZZO6BtB0nZUAgaT3kwlh76wHf6Gs9kknvdlQVnJ3rok'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
