import { supabase } from './supabase'

export async function uploadFile(path: string, file: File): Promise<string | null> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('path', path)

  const { data, error } = await supabase.functions.invoke('upload-file', {
    body: formData,
  })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  if (data?.error) {
    console.error('Upload server error:', data.error)
    return null
  }

  return data?.url ?? null
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
