import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { ParticipantPicker } from '@/components/shared/ParticipantPicker'
import { useAction } from '@/hooks/useAsync'
import { ACTIVITY_CATEGORIES, ACTIVITY_RESULTS } from '@/lib/constants'
import { todayKey } from '@/lib/dates'
import { activitiesRepo, validateActivity, type ActivityInput } from '@/repositories'
import type { ActivityCategory, ActivityResult, Participant, StudyActivity } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: Participant[]
  defaultParticipantId?: string
  activity?: StudyActivity
}

function emptyForm(participantId: string): ActivityInput {
  return { participantId, category: 'listening', date: todayKey(), durationMinutes: 20, description: '', notes: '', wordCount: undefined, result: undefined }
}

/** Formulário de criação/edição de atividade, com validação. */
export function ActivityFormDialog({ open, onOpenChange, participants, defaultParticipantId, activity }: Props) {
  const [form, setForm] = useState<ActivityInput>(() => emptyForm(defaultParticipantId ?? participants[0]?.id ?? ''))
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setTouched(false)
    if (activity) {
      const { id: _id, createdAt: _c, updatedAt: _u, source: _s, sourceId: _si, ...rest } = activity
      setForm(rest)
    } else setForm(emptyForm(defaultParticipantId ?? participants[0]?.id ?? ''))
  }, [open, activity, defaultParticipantId, participants])

  const errors = validateActivity(form)
  const set = <K extends keyof ActivityInput>(k: K, v: ActivityInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const showWords = form.category === 'vocabulary' || form.category === 'writing'

  const { run, pending } = useAction(async () => {
    const payload = { ...form, wordCount: showWords ? form.wordCount : undefined }
    if (activity) await activitiesRepo.update(activity.id, payload)
    else await activitiesRepo.add(payload)
  }, activity ? 'Atividade atualizada.' : 'Atividade registrada.')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(errors).length) return
    if (await run()) onOpenChange(false)
  }

  const err = (k: string) => (touched ? errors[k] : undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{activity ? 'Editar atividade' : 'Registrar estudo'}</DialogTitle>
          <DialogDescription>A pontuação da semana é recalculada automaticamente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label="Participante">
            <ParticipantPicker participants={participants} value={form.participantId} onChange={(id) => set('participantId', id)} />
          </Field>
          <Field label="Categoria" htmlFor="act-cat" hint={ACTIVITY_CATEGORIES[form.category].hint} error={err('category')}>
            <NativeSelect id="act-cat" value={form.category} onChange={(e) => set('category', e.target.value as ActivityCategory)}>
              {(Object.keys(ACTIVITY_CATEGORIES) as ActivityCategory[]).map((c) => (
                <option key={c} value={c}>
                  {ACTIVITY_CATEGORIES[c].label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" htmlFor="act-date" error={err('date')}>
              <Input id="act-date" type="date" max={todayKey()} value={form.date} onChange={(e) => set('date', e.target.value)} aria-invalid={Boolean(err('date'))} />
            </Field>
            <Field label="Duração (min)" htmlFor="act-dur" error={err('durationMinutes')}>
              <Input id="act-dur" type="number" inputMode="numeric" min={1} value={Number.isFinite(form.durationMinutes) ? form.durationMinutes : ''} onChange={(e) => set('durationMinutes', Number(e.target.value))} aria-invalid={Boolean(err('durationMinutes'))} />
            </Field>
          </div>
          {showWords && (
            <Field
              label={form.category === 'vocabulary' ? 'Palavras aprendidas' : 'Palavras escritas'}
              htmlFor="act-words"
              error={err('wordCount')}
              hint={form.category === 'vocabulary' ? 'Somente palavras fora dos flashcards (esses contam sozinhos).' : 'Textos com o mínimo de palavras da sua meta contam para Writing.'}
            >
              <Input id="act-words" type="number" inputMode="numeric" min={0} value={form.wordCount ?? ''} onChange={(e) => set('wordCount', e.target.value === '' ? undefined : Number(e.target.value))} />
            </Field>
          )}
          <Field label="Descrição" htmlFor="act-desc" error={err('description')}>
            <Input id="act-desc" value={form.description} maxLength={500} placeholder="Ex.: Podcast Coffee Break Spanish ep. 12" onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label="Resultado">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Resultado">
              {(Object.keys(ACTIVITY_RESULTS) as ActivityResult[]).map((r) => (
                <Button key={r} size="sm" variant={form.result === r ? 'default' : 'outline'} role="radio" aria-checked={form.result === r} onClick={() => set('result', form.result === r ? undefined : r)}>
                  {ACTIVITY_RESULTS[r]}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="Observações" htmlFor="act-notes">
            <Textarea id="act-notes" value={form.notes} maxLength={1000} onChange={(e) => set('notes', e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvando…' : activity ? 'Salvar alterações' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
