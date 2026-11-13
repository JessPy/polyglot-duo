import { describe, expect, it } from 'vitest'
import { audioMimeType, titleFromFileName } from '@/lib/audio'

describe('arquivos de áudio importados', () => {
  it('usa o tipo informado ou deduz pela extensão', () => {
    expect(audioMimeType({ name: 'a.mp3', type: 'audio/mpeg' })).toBe('audio/mpeg')
    expect(audioMimeType({ name: 'PTT-20261113-WA0001.m4a', type: '' })).toBe('audio/mp4')
    expect(audioMimeType({ name: 'voz.opus', type: '' })).toBe('audio/ogg')
    expect(audioMimeType({ name: 'video.mp4', type: 'video/mp4' })).toBe('audio/mp4')
    expect(audioMimeType({ name: 'foto.jpg', type: 'image/jpeg' })).toBeUndefined()
  })
  it('gera um título legível a partir do nome', () => {
    expect(titleFromFileName('dia_30-apresentacao.m4a')).toBe('dia 30 apresentacao')
  })
})
