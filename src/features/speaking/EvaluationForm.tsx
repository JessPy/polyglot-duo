import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/misc'
import { useAction } from '@/hooks/useAsync'
import { EVALUATION_CRITERIA } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { recordingsRepo, type EvaluationInput } from '@/repositories'
import type { SpeakingEvaluation } from '@/types'

export const emptyEvaluation: EvaluationInput = { clarity: 3, grammar: 3, vocabulary: 3, fluency: 3, evaluator: 'self' }

export function EvaluationFields({ value, onChange }: { value: EvaluationInput; onChange: (v: EvaluationInput) => void }) {
  const total = value.clarity + value.grammar + value.vocabulary + value.fluency
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Quem avaliou">
        {(['self', 'partner'] as const).map((e) => (
          <button key={e} role="radio" aria-checked={value.evaluator === e} onClick={() => onChange({ ...value, evaluator: e })} className={cn('h-8 flex-1 rounded-md text-sm font-medium text-muted-foreground', value.evaluator === e && 'bg-card text-foreground shadow-sm')}>
            {e === 'self' ? 'Autoavaliação' : 'Avaliação do parceiro'}
          </button>
        ))}
      </div>
      {EVALUATION_CRITERIA.map((c) => (
        <div key={c.key} className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{c.label}</span>
            <span className="tabular text-muted-foreground">{value[c.key]}/5</span>
          </div>
          <Slider min={0} max={5} step={1} value={[value[c.key]]} onValueChange={([v]) => onChange({ ...value, [c.key]: v })} aria-label={c.label} />
        </div>
      ))}
      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
        <span>Total</span>
        <span className="tabular font-semibold">{total}/20</span>
      </div>
      <p className="text-xs text-muted-foreground">Notas manuais, dadas por vocês. Não há análise automática do áudio.</p>
    </div>
  )
}

export function EvaluationDialog({ open, onOpenChange, recordingId, current }: { open: boolean; onOpenChange: (o: boolean) => void; recordingId?: string; current?: SpeakingEvaluation }) {
  const [value, setValue] = useState<EvaluationInput>(emptyEvaluation)
  useEffect(() => {
    if (open) setValue(current ? { clarity: current.clarity, grammar: current.grammar, vocabulary: current.vocabulary, fluency: current.fluency, evaluator: current.evaluator } : emptyEvaluation)
  }, [open, current])
  const save = useAction(async () => {
    if (recordingId) await recordingsRepo.evaluate(recordingId, value)
  }, 'Avaliação salva.')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avaliar gravação</DialogTitle>
          <DialogDescription>Notas de 0 a 5 em cada critério (total de 20).</DialogDescription>
        </DialogHeader>
        <EvaluationFields value={value} onChange={setValue} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={save.pending} onClick={async () => (await save.run()) && onOpenChange(false)}>
            Salvar avaliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
