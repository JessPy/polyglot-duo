import { Download, Library, Pencil, Star, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AudioPlayer } from '@/components/shared/AudioPlayer'
import { EmptyState } from '@/components/shared/Page'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/misc'
import { useAction } from '@/hooks/useAsync'
import { journeyDay } from '@/lib/competition'
import { formatLong, formatSeconds } from '@/lib/dates'
import { evaluationTotal } from '@/lib/stats'
import { downloadBlob, formatBytes, slugify } from '@/lib/utils'
import { recordingsRepo } from '@/repositories'
import { extensionForMime } from '@/services/backup'
import type { AudioRecording, Participant, SpeakingEvaluation } from '@/types'
import { EvaluationDialog } from './EvaluationForm'

type Sort = 'newest' | 'oldest' | 'longest' | 'shortest'

export async function downloadRecording(r: AudioRecording) {
  const blob = await recordingsRepo.getBlob(r.id)
  if (!blob) throw new Error('Arquivo de áudio não encontrado.')
  downloadBlob(blob, `${r.date}-${slugify(r.title) || 'gravacao'}.${extensionForMime(r.mimeType)}`)
}

export function RecordingLibrary({ participant, recordings, evaluations }: { participant: Participant; recordings: AudioRecording[]; evaluations: SpeakingEvaluation[] }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [topic, setTopic] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const [editing, setEditing] = useState<AudioRecording>()
  const [evaluating, setEvaluating] = useState<AudioRecording>()
  const [deleting, setDeleting] = useState<AudioRecording>()
  const remove = useAction((id: string) => recordingsRepo.remove(id), 'Gravação excluída definitivamente.')
  const download = useAction(downloadRecording)

  const evalFor = (id: string) => evaluations.filter((e) => e.recordingId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const topics = useMemo(() => [...new Set(recordings.map((r) => r.topic).filter(Boolean))].sort(), [recordings])

  const list = recordings
    .filter((r) => (!from || r.date >= from) && (!to || r.date <= to) && (!topic || r.topic === topic))
    .sort((a, b) => {
      if (sort === 'longest') return b.durationSeconds - a.durationSeconds
      if (sort === 'shortest') return a.durationSeconds - b.durationSeconds
      const cmp = a.createdAt.localeCompare(b.createdAt)
      return sort === 'oldest' ? cmp : -cmp
    })

  if (recordings.length === 0) return <EmptyState icon={Library} title="Nenhuma gravação ainda" description={`As gravações de ${participant.name} aparecerão aqui.`} />

  return (
    <div className="flex flex-col gap-4">
      <Card className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
        <Field label="De" htmlFor="lib-from">
          <Input id="lib-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Até" htmlFor="lib-to">
          <Input id="lib-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Tema" htmlFor="lib-topic">
          <NativeSelect id="lib-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">Todos</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Ordenar" htmlFor="lib-sort">
          <NativeSelect id="lib-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigas</option>
            <option value="longest">Maior duração</option>
            <option value="shortest">Menor duração</option>
          </NativeSelect>
        </Field>
      </Card>

      {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma gravação com esses filtros.</p>}

      {list.map((r) => {
        const ev = evalFor(r.id)
        return (
          <Card key={r.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatLong(r.date)} · dia {journeyDay(participant.startDate, r.date)} · {formatSeconds(r.durationSeconds)} · {formatBytes(r.size)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.topic && <Badge variant="outline">{r.topic}</Badge>}
                  {ev ? (
                    <Badge variant="brand">
                      <Star className="size-3" /> {evaluationTotal(ev)}/20 · {ev.evaluator === 'self' ? 'autoavaliação' : 'parceiro'}
                    </Badge>
                  ) : (
                    <Badge>Sem avaliação</Badge>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button variant="ghost" size="icon-sm" aria-label="Avaliar" title="Avaliar" onClick={() => setEvaluating(r)}>
                  <Star />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Editar" title="Renomear / observações" onClick={() => setEditing(r)}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Baixar arquivo" title="Baixar arquivo" onClick={() => download.run(r)}>
                  <Download />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Excluir" title="Excluir definitivamente" onClick={() => setDeleting(r)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
            <AudioPlayer recordingId={r.id} fallbackDuration={r.durationSeconds} />
            {r.notes && <p className="text-sm whitespace-pre-line text-muted-foreground">{r.notes}</p>}
          </Card>
        )
      })}

      <EditRecordingDialog recording={editing} onClose={() => setEditing(undefined)} />
      <EvaluationDialog open={Boolean(evaluating)} onOpenChange={(o) => !o && setEvaluating(undefined)} recordingId={evaluating?.id} current={evaluating ? evalFor(evaluating.id) : undefined} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Excluir gravação definitivamente?"
        description="O áudio, a avaliação e a sessão de speaking vinculada serão apagados deste navegador. Considere baixar o arquivo antes."
        confirmLabel="Excluir definitivamente"
        destructive
        onConfirm={async () => {
          if (deleting) await remove.run(deleting.id)
        }}
      />
    </div>
  )
}

function EditRecordingDialog({ recording, onClose }: { recording?: AudioRecording; onClose: () => void }) {
  const [form, setForm] = useState({ title: '', topic: '', notes: '' })
  useEffect(() => {
    if (recording) setForm({ title: recording.title, topic: recording.topic, notes: recording.notes })
  }, [recording])
  const save = useAction(async () => {
    if (!recording) return
    if (!form.title.trim()) throw new Error('O título não pode ficar vazio.')
    await recordingsRepo.update(recording.id, { title: form.title.trim(), topic: form.topic.trim(), notes: form.notes.trim() })
  }, 'Gravação atualizada.')
  return (
    <Dialog open={Boolean(recording)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar gravação</DialogTitle>
          <DialogDescription>Renomeie, ajuste o tema ou adicione observações.</DialogDescription>
        </DialogHeader>
        <Field label="Título" htmlFor="ed-title">
          <Input id="ed-title" value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Tema" htmlFor="ed-topic">
          <Input id="ed-topic" value={form.topic} maxLength={120} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        </Field>
        <Field label="Observações" htmlFor="ed-notes">
          <Textarea id="ed-notes" value={form.notes} maxLength={1000} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={save.pending} onClick={async () => (await save.run()) && onClose()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

