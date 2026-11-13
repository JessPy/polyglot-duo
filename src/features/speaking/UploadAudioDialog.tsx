import { FileAudio, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AudioPlayer } from '@/components/shared/AudioPlayer'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/misc'
import { useAction } from '@/hooks/useAsync'
import { MAX_AUDIO_BYTES, audioMimeType, readAudioDuration, titleFromFileName } from '@/lib/audio'
import { journeyDay } from '@/lib/competition'
import { formatSeconds, todayKey } from '@/lib/dates'
import { formatBytes } from '@/lib/utils'
import { recordingsRepo, type EvaluationInput } from '@/repositories'
import type { Participant } from '@/types'
import { EvaluationFields, emptyEvaluation } from './EvaluationForm'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  participant: Participant
}

/** Importa um arquivo de áudio existente para a biblioteca, escolhendo o dia da gravação. */
export function UploadAudioDialog({ open, onOpenChange, participant }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File>()
  const [mime, setMime] = useState<string>()
  const [blob, setBlob] = useState<Blob>()
  const [fileError, setFileError] = useState<string>()
  const [reading, setReading] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const [manualMinutes, setManualMinutes] = useState(2)
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [date, setDate] = useState(todayKey())
  const [notes, setNotes] = useState('')
  const [registerAsSpeaking, setRegister] = useState(true)
  const [evaluate, setEvaluate] = useState(false)
  const [evaluation, setEvaluation] = useState<EvaluationInput>(emptyEvaluation)

  useEffect(() => {
    if (!open) return
    setFile(undefined)
    setMime(undefined)
    setBlob(undefined)
    setFileError(undefined)
    setDuration(null)
    setTitle('')
    setTopic('')
    setDate(todayKey())
    setNotes('')
    setEvaluate(false)
    setEvaluation(emptyEvaluation)
  }, [open])

  const pick = async (f: File) => {
    setFileError(undefined)
    const type = audioMimeType(f)
    if (!type) {
      setFileError('Formato não reconhecido. Use um arquivo de áudio (m4a, mp3, wav, ogg, webm…).')
      return
    }
    if (f.size > MAX_AUDIO_BYTES) {
      setFileError(`Arquivo muito grande (${formatBytes(f.size)}). O limite é ${formatBytes(MAX_AUDIO_BYTES)}.`)
      return
    }
    const typed = new Blob([f], { type })
    setFile(f)
    setMime(type)
    setBlob(typed)
    setTitle((t) => t || titleFromFileName(f.name))
    // Sugere a data de modificação do arquivo (geralmente o dia em que foi gravado).
    if (f.lastModified) {
      const d = new Date(f.lastModified)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (key <= todayKey()) setDate(key)
    }
    setReading(true)
    setDuration(await readAudioDuration(typed))
    setReading(false)
  }

  const dateError = !date ? 'Informe a data.' : date > todayKey() ? 'A data não pode estar no futuro.' : undefined
  const durationSeconds = duration ?? manualMinutes * 60

  const save = useAction(async () => {
    if (!file || !mime || !blob) throw new Error('Escolha um arquivo de áudio.')
    if (dateError) throw new Error(dateError)
    const id = await recordingsRepo.save(
      {
        participantId: participant.id,
        language: participant.language,
        date,
        durationSeconds: Math.round(durationSeconds),
        title: title.trim() || titleFromFileName(file.name) || 'Áudio importado',
        topic: topic.trim(),
        notes: notes.trim(),
      },
      blob,
      { registerAsSpeaking, mimeType: mime },
    )
    if (evaluate) await recordingsRepo.evaluate(id, evaluation)
  }, 'Áudio adicionado à biblioteca.')

  return (
    <Dialog open={open} onOpenChange={(o) => !save.pending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar áudio</DialogTitle>
          <DialogDescription>
            Importe uma gravação existente para {participant.avatar} {participant.name}. O arquivo original é mantido, sem conversão.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.ogg,.opus,.webm,.aac,.flac"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void pick(f)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center transition hover:bg-muted"
        >
          {file ? <FileAudio className="size-6" /> : <Upload className="size-6 text-muted-foreground" />}
          <span className="text-sm font-medium">{file ? file.name : 'Escolher arquivo de áudio'}</span>
          <span className="text-xs text-muted-foreground">
            {file ? `${formatBytes(file.size)} · ${reading ? 'lendo duração…' : duration != null ? formatSeconds(duration) : 'duração não detectada'}` : 'm4a, mp3, wav, ogg, webm… até 100 MB'}
          </span>
        </button>
        {fileError && (
          <p className="text-sm text-destructive" role="alert">
            {fileError}
          </p>
        )}

        {file && blob && (
          <div className="flex flex-col gap-4">
            <AudioPlayer blob={blob} fallbackDuration={durationSeconds} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Dia da gravação" htmlFor="up-date" error={dateError} hint={dateError ? undefined : journeyDay(participant.startDate, date) >= 1 ? `Dia ${journeyDay(participant.startDate, date)} da jornada` : 'Antes do início da competição'}>
                <Input id="up-date" type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(dateError)} />
              </Field>
              {!reading && duration == null && (
                <Field label="Duração (min)" htmlFor="up-dur" hint="Não foi possível ler a duração do arquivo.">
                  <Input id="up-dur" type="number" min={1} value={manualMinutes} onChange={(e) => setManualMinutes(Math.max(1, Number(e.target.value)))} />
                </Field>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Título" htmlFor="up-title">
                <Input id="up-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Tema" htmlFor="up-topic">
                <Input id="up-topic" value={topic} maxLength={120} onChange={(e) => setTopic(e.target.value)} />
              </Field>
            </div>
            <Field label="Observações" htmlFor="up-notes">
              <Textarea id="up-notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <span>
                <span className="font-medium">Registrar como sessão de speaking</span>
                <span className="block text-xs text-muted-foreground">Conta na semana do dia escolhido (uma vez por áudio).</span>
              </span>
              <Switch checked={registerAsSpeaking} onCheckedChange={setRegister} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <span className="font-medium">Avaliar agora</span>
              <Switch checked={evaluate} onCheckedChange={setEvaluate} />
            </label>
            {evaluate && <EvaluationFields value={evaluation} onChange={setEvaluation} />}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={save.pending} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!file || reading || Boolean(dateError) || save.pending} onClick={async () => (await save.run()) && onOpenChange(false)}>
            {save.pending ? 'Salvando…' : 'Adicionar à biblioteca'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
