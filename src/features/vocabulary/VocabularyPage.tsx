import { BookOpen, Download, GraduationCap, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState, LoadingState, PageHeader, PageTransition, StatTile } from '@/components/shared/Page'
import { ParticipantPicker } from '@/components/shared/ParticipantPicker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Input, NativeSelect } from '@/components/ui/input'
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/misc'
import { useAction } from '@/hooks/useAsync'
import { useActiveParticipant, useDataBundle } from '@/hooks/useData'
import { useToday } from '@/hooks/useToday'
import { LANGUAGES } from '@/lib/constants'
import { FLASHCARD_CSV_HEADER, parseFlashcardCsv, toCsv } from '@/lib/csv'
import { addDays, formatShort, toDateKey } from '@/lib/dates'
import { downloadBlob } from '@/lib/utils'
import { vocabularyRepo, type VocabularyInput } from '@/repositories'
import { useUiStore } from '@/store/ui'
import type { LearningState, VocabularyItem } from '@/types'
import { ReviewSession } from './ReviewSession'

const STATE_LABELS: Record<LearningState, { label: string; variant: 'default' | 'outline' | 'brand' | 'success' | 'warning' }> = {
  new: { label: 'Nova', variant: 'outline' },
  learning: { label: 'Aprendendo', variant: 'warning' },
  review: { label: 'Em revisão', variant: 'brand' },
  learned: { label: 'Aprendida', variant: 'success' },
}

export default function VocabularyPage() {
  const bundle = useDataBundle()
  const today = useToday()
  const active = useActiveParticipant(bundle?.participants)
  const setActive = useUiStore((s) => s.setActiveParticipant)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState<LearningState | ''>('')
  const [editing, setEditing] = useState<VocabularyItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<VocabularyItem>()
  const fileRef = useRef<HTMLInputElement>(null)
  const remove = useAction((id: string) => vocabularyRepo.remove(id), 'Palavra excluída.')

  const items = useMemo(() => (bundle && active ? bundle.vocabulary.filter((v) => v.participantId === active.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []), [bundle, active])
  const due = useMemo(() => items.filter((v) => v.dueDate <= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [items, today])

  if (!bundle || !active) return <LoadingState />
  const reviews = bundle.reviews.filter((r) => r.participantId === active.id)
  const recent = reviews.filter((r) => r.date >= addDays(today, -30))
  const retention = recent.length ? Math.round((recent.filter((r) => r.correct).length / recent.length) * 100) : null
  const count = (s: LearningState) => items.filter((v) => v.state === s).length

  const filtered = items.filter((v) => {
    const q = search.trim().toLowerCase()
    return (!q || v.term.toLowerCase().includes(q) || v.translation.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)) && (!stateFilter || v.state === stateFilter)
  })

  const exportCsv = () => {
    const rows = [[...FLASHCARD_CSV_HEADER], ...items.map((v) => [v.term, v.translation, v.example, v.category])]
    downloadBlob(new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }), `flashcards-${active.name.toLowerCase()}-${today}.csv`)
  }

  const importCsv = async (file: File) => {
    try {
      const { rows, errors } = parseFlashcardCsv(await file.text())
      if (!rows.length) {
        toast.error(errors[0] ?? 'Nenhuma palavra encontrada no arquivo.')
        return
      }
      const { added, skipped } = await vocabularyRepo.importRows(active.id, active.language, rows)
      toast.success(`${added} palavra(s) importada(s).`, { description: [skipped && `${skipped} já existiam.`, errors.length && `${errors.length} linha(s) inválida(s).`].filter(Boolean).join(' ') || undefined })
    } catch {
      toast.error('Não foi possível ler o arquivo CSV.')
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Vocabulário"
        icon={BookOpen}
        description={`Flashcards de ${LANGUAGES[active.language].label.toLowerCase()} com revisão espaçada (SM-2).`}
        actions={
          <>
            <ParticipantPicker participants={bundle.participants} value={active.id} onChange={setActive} />
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus /> Nova palavra
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Cadastradas" value={items.length} />
        <StatTile label="Aprendidas" value={count('learned')} hint="3 acertos seguidos" />
        <StatTile label="Em revisão" value={count('learning') + count('review')} />
        <StatTile label="Revisões pendentes" value={due.length} />
        <StatTile label="Retenção (30 dias)" value={retention == null ? '—' : `${retention}%`} hint={`${recent.length} respostas`} className="col-span-2 md:col-span-1" />
      </div>

      <Tabs defaultValue={due.length ? 'review' : 'words'}>
        <TabsList>
          <TabsTrigger value="review">
            <GraduationCap className="size-4" /> Revisar {due.length > 0 && <Badge variant="brand">{due.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="words">Palavras</TabsTrigger>
        </TabsList>

        <TabsContent value="review">
          <ReviewSession key={active.id} due={due} />
        </TabsContent>

        <TabsContent value="words">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar termo, tradução ou categoria" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Buscar palavras" />
            </div>
            <div className="flex gap-2">
              <div className="w-40">
                <NativeSelect value={stateFilter} onChange={(e) => setStateFilter(e.target.value as LearningState | '')} aria-label="Filtrar por estado">
                  <option value="">Todos os estados</option>
                  {(Object.keys(STATE_LABELS) as LearningState[]).map((s) => (
                    <option key={s} value={s}>
                      {STATE_LABELS[s].label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importCsv(f)
                e.target.value = ''
              }} />
              <Button variant="outline" size="icon" aria-label="Importar CSV" title="Importar CSV (term, translation, example, category)" onClick={() => fileRef.current?.click()}>
                <Upload />
              </Button>
              <Button variant="outline" size="icon" aria-label="Exportar CSV" title="Exportar CSV" onClick={exportCsv} disabled={!items.length}>
                <Download />
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={items.length ? 'Nenhuma palavra encontrada' : 'Nenhuma palavra cadastrada'}
              description={items.length ? 'Ajuste a busca ou o filtro.' : 'Cadastre palavras e expressões ou importe um CSV com as colunas term, translation, example, category.'}
            />
          ) : (
            <Card className="divide-y">
              {filtered.map((v) => (
                <div key={v.id} className="flex items-start gap-3 p-3 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{v.term}</span>
                      <span className="text-muted-foreground">— {v.translation}</span>
                      <Badge variant={STATE_LABELS[v.state].variant}>{STATE_LABELS[v.state].label}</Badge>
                      {v.category && <Badge variant="outline">{v.category}</Badge>}
                    </div>
                    {v.example && <p className="mt-1 truncate text-sm text-muted-foreground italic">{v.example}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Criada em {formatShort(toDateKey(new Date(v.createdAt)))} · próxima revisão {v.dueDate <= today ? 'hoje' : formatShort(v.dueDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Editar ${v.term}`}
                      onClick={() => {
                        setEditing(v)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${v.term}`} onClick={() => setDeleting(v)}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <WordDialog open={formOpen} onOpenChange={setFormOpen} item={editing} participantId={active.id} language={active.language} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={`Excluir “${deleting?.term}”?`}
        description="O histórico de revisões desta palavra também será apagado."
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (deleting) await remove.run(deleting.id)
        }}
      />
    </PageTransition>
  )
}

function WordDialog({ open, onOpenChange, item, participantId, language }: { open: boolean; onOpenChange: (o: boolean) => void; item: VocabularyItem | null; participantId: string; language: VocabularyInput['language'] }) {
  const [form, setForm] = useState({ term: '', translation: '', example: '', category: '' })
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (!open) return
    setTouched(false)
    setForm(item ? { term: item.term, translation: item.translation, example: item.example, category: item.category } : { term: '', translation: '', example: '', category: '' })
  }, [open, item])
  const save = useAction(async () => {
    if (item) await vocabularyRepo.update(item.id, form)
    else await vocabularyRepo.add({ ...form, participantId, language })
  }, item ? 'Palavra atualizada.' : 'Palavra cadastrada.')

  const errors = { term: !form.term.trim() ? 'Informe o termo.' : '', translation: !form.translation.trim() ? 'Informe a tradução.' : '' }
  const submit = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault()
    setTouched(true)
    if (errors.term || errors.translation) return
    if (await save.run()) {
      if (keepOpen && !item) {
        setForm((f) => ({ term: '', translation: '', example: '', category: f.category }))
        setTouched(false)
      } else onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Editar palavra' : 'Nova palavra'}</DialogTitle>
          <DialogDescription>Palavras novas entram na fila de revisão. Só contam como aprendidas após 3 acertos seguidos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => submit(e)} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Termo ou expressão" htmlFor="w-term" error={touched ? errors.term : undefined}>
              <Input id="w-term" autoFocus value={form.term} maxLength={120} onChange={(e) => setForm({ ...form, term: e.target.value })} />
            </Field>
            <Field label="Tradução" htmlFor="w-tr" error={touched ? errors.translation : undefined}>
              <Input id="w-tr" value={form.translation} maxLength={200} onChange={(e) => setForm({ ...form, translation: e.target.value })} />
            </Field>
          </div>
          <Field label="Frase de exemplo" htmlFor="w-ex">
            <Input id="w-ex" value={form.example} maxLength={300} onChange={(e) => setForm({ ...form, example: e.target.value })} />
          </Field>
          <Field label="Categoria" htmlFor="w-cat" hint="Ex.: verbos, comida, trabalho, phrasal verbs">
            <Input id="w-cat" value={form.category} maxLength={40} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <DialogFooter>
            {!item && (
              <Button variant="outline" disabled={save.pending} onClick={(e) => submit(e, true)}>
                Salvar e adicionar outra
              </Button>
            )}
            <Button type="submit" disabled={save.pending}>
              {save.pending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
