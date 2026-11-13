/** Utilitários para arquivos de áudio importados. */

export const MAX_AUDIO_BYTES = 100 * 1024 * 1024

const EXTENSION_MIME: Record<string, string> = {
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  webm: 'audio/webm',
  flac: 'audio/flac',
  caf: 'audio/x-caf',
  amr: 'audio/amr',
}

/** Alguns sistemas entregam `type` vazio (ex.: .m4a do WhatsApp); deduz pelo nome. */
export function audioMimeType(file: { name: string; type: string }): string | undefined {
  if (file.type.startsWith('audio/')) return file.type
  if (file.type === 'video/mp4' || file.type === 'video/webm') return file.type.replace('video', 'audio')
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_MIME[ext]
}

export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 80)
}

/**
 * Lê a duração (segundos) pelos metadados do navegador.
 * Contorna o bug do Chrome em que arquivos WebM informam duração Infinity.
 * Resolve null se o formato não puder ser lido.
 */
export function readAudioDuration(blob: Blob, timeoutMs = 8000): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    let done = false
    const finish = (value: number | null) => {
      if (done) return
      done = true
      audio.removeAttribute('src')
      URL.revokeObjectURL(url)
      resolve(value)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        clearTimeout(timer)
        finish(audio.duration)
        return
      }
      audio.currentTime = 1e7
      audio.ontimeupdate = () => {
        audio.ontimeupdate = null
        clearTimeout(timer)
        finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null)
      }
    }
    audio.onerror = () => {
      clearTimeout(timer)
      finish(null)
    }
    audio.src = url
  })
}
