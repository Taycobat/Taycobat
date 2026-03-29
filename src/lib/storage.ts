import { supabase } from './supabase'

const BUCKET = 'uploads'

export async function uploadFile(path: string, file: File): Promise<string | null> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) {
    console.error('Upload error:', error)
    return null
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
