import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, Archive, Database, Download, FileAudio, Monitor, Moon, Palette, Settings, ShieldCheck, Sun, Target, Upload, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { LoadingState, PageHeader, PageTransition } from '@/components/shared/Page'
import { AvatarPicker, ColorPicker, GoalFields, LanguageSelect, LevelSelect, MinutesFields } from '@/components/shared/ProfileFields'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { Badge, Segmented, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/misc'
import { useAction } from '@/hooks/useAsync'
import { useDataBundle } from '@/hooks/useData'
import { formatDateTime, formatShort } from '@/lib/dates'
import { goalForWeek, type GoalTargets } from '@/lib/scoring'
import { startOfWeek, todayKey } from '@/lib/dates'
import { downloadBlob, formatBytes } from '@/lib/utils'
import { META_KEYS, goalsRepo, metaRepo, participantsRepo } from '@/repositories'
import {
  BackupValidationError,
  clearAllData,
  exportBackup,
  getStorageInfo,
  importBackup,
  readBackup,
  requestPersistentStorage,
  type BackupKind,
  type ImportMode,
  type ParsedBackup,
} from '@/services/backup'
import { useUiStore, type ThemePreference } from '@/store/ui'
import type { Participant } from '@/types'

export default function SettingsPage() {
  const bundle = useDataBundle()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'profiles'
  if (!bundle) return <LoadingState />
  return (
    <PageTransition>
      <PageHeader title="Configurações" icon={Settings} description="Perfis, metas, aparência e gerenciamento dos dados locais." />
      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="profiles">
            <Users className="size-4" /> Perfis
          </TabsTrigger>
          <TabsTrigger value="goals">
            <Target className="size-4" /> Metas
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="size-4" /> Dados
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="size-4" /> Aparência
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profiles">
          <div className="grid gap-4 lg:grid-cols-2">
            {bundle.participants.map((p) => (
              <ProfileForm key={p.id} participant={p} other={bundle.participants.find((x) => x.id !== p.id)} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="goals">
          <div className="grid gap-4 lg:grid-cols-2">
            {bundle.participants.map((p) => (
              <GoalsForm key={p.id} participant={p} goals={bundle.goals.filter((g) => g.participantId === p.id)} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="data">
          <DataManagement />
        </TabsContent>
        <TabsContent value="appearance">
          <Appearance />
        </TabsContent>
      </Tabs>
    </PageTransition>
  )
}

function ProfileForm({ participant, other }: { participant: Participant; other?: Participant }) {
  const [form, setForm] = useState(participant)
  useEffect(() => setForm(participant), [participant])
  const save = useAction(async () => {
    if (!form.name.trim()) throw new Error('Informe um nome.')
    const { id: _i, slot: _s, createdAt: _c, updatedAt: _u, ...changes } = form
    await participantsRepo.update(participant.id, { ...changes, name: form.name.trim() })
  }, 'Perfil atualizado.')
  const set = <K extends keyof Participant>(k: K, v: Participant[K]) => setForm((f) => ({ ...f, [k]: v }))
  const id = participant.id.slice(0, 6)
  return (
    <Card className="flex flex-col gap-4 p-5">
      <p className="font-semibold">
        {form.avatar} Participante {participant.slot}
      </p>
      <Field label="Nome" htmlFor={`pf-name-${id}`}>
        <Input id={`pf-name-${id}`} value={form.name} maxLength={30} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Avatar">
        <AvatarPicker value={form.avatar} onChange={(v) => set('avatar', v)} />
      </Field>
      <Field label="Cor">
        <ColorPicker value={form.color} onChange={(v) => set('color', v)} taken={other?.color} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Idioma" htmlFor={`pf-lang-${id}`}>
          <LanguageSelect id={`pf-lang-${id}`} value={form.language} onChange={(v) => set('language', v)} />
        </Field>
        <Field label="Nível atual" htmlFor={`pf-cur-${id}`}>
          <LevelSelect id={`pf-cur-${id}`} value={form.currentLevel} onChange={(v) => set('currentLevel', v)} />
        </Field>
        <Field label="Desejado" htmlFor={`pf-tgt-${id}`}>
          <LevelSelect id={`pf-tgt-${id}`} value={form.targetLevel} onChange={(v) => set('targetLevel', v)} />
        </Field>
      </div>
      <MinutesFields idPrefix={`pf-${id}`} daily={form.dailyGoalMinutes} weekly={form.weeklyGoalMinutes} onDaily={(v) => set('dailyGoalMinutes', v)} onWeekly={(v) => set('weeklyGoalMinutes', v)} />
      <Field label="Data de início" htmlFor={`pf-start-${id}`} hint="Define os marcos dos dias 1, 30, 60 e 90.">
        <Input id={`pf-start-${id}`} type="date" value={form.startDate} max={todayKey()} onChange={(e) => e.target.value && set('startDate', e.target.value)} />
      </Field>
      <Button className="self-end" onClick={() => save.run()} disabled={save.pending}>
        Salvar perfil
      </Button>
    </Card>
  )
}

function GoalsForm({ participant, goals }: { participant: Participant; goals: Parameters<typeof goalForWeek>[0] }) {
  const current = goalForWeek(goals, startOfWeek(todayKey()))
  const [form, setForm] = useState<GoalTargets>(current)
  const key = JSON.stringify(current)
  useEffect(() => setForm(JSON.parse(key)), [key])
  const save = useAction(() => goalsRepo.save(participant.id, form), 'Metas atualizadas a partir desta semana.')
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <p className="font-semibold">
          {participant.avatar} {participant.name}
        </p>
        <p className="text-xs text-muted-foreground">Mudanças valem a partir desta semana; semanas anteriores mantêm as metas da época.</p>
      </div>
      <GoalFields idPrefix={`gf-${participant.id.slice(0, 6)}`} value={form} onChange={setForm} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{goals.length} versão(ões) de metas</span>
        <Button onClick={() => save.run()} disabled={save.pending}>
          Salvar metas
        </Button>
      </div>
    </Card>
  )
}

function Appearance() {
  const { theme, setTheme } = useUiStore()
  return (
    <Card className="flex flex-col gap-3 p-5">
      <p className="font-semibold">Tema</p>
      <Segmented<ThemePreference>
        label="Tema"
        value={theme}
        onChange={setTheme}
        options={[
          { value: 'system', label: <span className="flex items-center gap-1.5"><Monitor className="size-4" /> Sistema</span> },
          { value: 'light', label: <span className="flex items-center gap-1.5"><Sun className="size-4" /> Claro</span> },
          { value: 'dark', label: <span className="flex items-center gap-1.5"><Moon className="size-4" /> Escuro</span> },
        ]}
      />
      <p className="text-xs text-muted-foreground">Preferências como tema e perfil ativo ficam no localStorage; todos os dados ficam no IndexedDB.</p>
    </Card>
  )
}

function DataManagement() {
  const lastBackup = useLiveQuery(() => metaRepo.get<string>(META_KEYS.lastBackupAt), [])
  const [storageTick, setStorageTick] = useState(0)
  const storage = useLiveQuery(() => getStorageInfo(), [storageTick, lastBackup])
  const [exporting, setExporting] = useState<BackupKind | null>(null)
  const [progress, setProgress] = useState(0)
  const [parsed, setParsed] = useState<ParsedBackup>()
  const [mode, setMode] = useState<ImportMode>('merge')
  const [importing, setImporting] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const doExport = async (kind: BackupKind) => {
    setExporting(kind)
    setProgress(0)
    try {
      const blob = await exportBackup(kind, setProgress)
      const now = new Date()
      const stamp = `${todayKey(now)}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
      downloadBlob(blob, `polyglot-duo-${kind === 'full' ? 'backup' : 'gravacoes'}-${stamp}.zip`)
      toast.success('Backup gerado.', { description: `${formatBytes(blob.size)}. Guarde o arquivo em um lugar seguro (nuvem, e-mail, pendrive).` })
      setStorageTick((t) => t + 1)
    } catch (err) {
      toast.error('Falha ao gerar o backup.', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setExporting(null)
    }
  }

  const onFile = async (file: File) => {
    try {
      const p = await readBackup(file)
      setMode(p.manifest.kind === 'full' ? 'merge' : 'merge')
      setParsed(p)
    } catch (err) {
      toast.error(err instanceof BackupValidationError ? err.message : 'Não foi possível ler o arquivo.')
    }
  }

  const doImport = async () => {
    if (!parsed) return
    setImporting(true)
    try {
      const summary = await importBackup(parsed, mode)
      const total = Object.values(summary.added).reduce((a, b) => a + b, 0)
      toast.success('Backup restaurado.', { description: `${total} registros e ${summary.audioRestored} áudios importados${summary.skipped ? `, ${summary.skipped} já existiam` : ''}.` })
      summary.warnings.forEach((w) => toast.warning(w))
      setParsed(undefined)
      setStorageTick((t) => t + 1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha na importação. Nenhum dado foi alterado.')
    } finally {
      setImporting(false)
    }
  }

  const persist = useAction(async () => {
    const ok = await requestPersistentStorage()
    setStorageTick((t) => t + 1)
    if (ok) toast.success('Armazenamento persistente ativado.')
    else toast.warning('O navegador não concedeu armazenamento persistente. Mantenha backups em dia.')
  })

  const daysSinceBackup = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86_400_000) : null

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex gap-3 border-warning/40 bg-warning/5 p-4 text-sm">
        <AlertTriangle className="size-5 shrink-0 text-warning" />
        <p>
          Os dados ficam <strong>apenas neste navegador e dispositivo</strong>. Eles não sincronizam entre celular e computador e podem ser perdidos se os dados do navegador forem apagados. Exporte backups com frequência — especialmente das gravações.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Último backup completo</p>
          <p className="mt-1 font-semibold">{lastBackup ? formatDateTime(lastBackup) : 'Nunca'}</p>
          {daysSinceBackup != null && daysSinceBackup >= 7 && <Badge variant="warning" className="mt-2">Há {daysSinceBackup} dias</Badge>}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Tamanho estimado</p>
          <p className="mt-1 font-semibold tabular">{storage ? formatBytes(storage.audioBytes + storage.dataBytes) : '…'}</p>
          {storage && (
            <p className="text-xs text-muted-foreground">
              Áudios {formatBytes(storage.audioBytes)} · dados {formatBytes(storage.dataBytes)}
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Espaço do navegador</p>
          <p className="mt-1 font-semibold tabular">{storage?.usage != null ? `${formatBytes(storage.usage)} de ${formatBytes(storage.quota ?? 0)}` : 'Indisponível'}</p>
          {storage?.persisted ? (
            <Badge variant="success" className="mt-2">
              <ShieldCheck className="size-3" /> Persistente
            </Badge>
          ) : (
            <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => persist.run()}>
              Pedir armazenamento persistente
            </Button>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <p className="font-semibold">Exportar</p>
        <p className="mb-4 text-sm text-muted-foreground">ZIP versionado com JSON dos dados e os arquivos de áudio originais (sem conversão).</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => doExport('full')} disabled={Boolean(exporting)}>
            <Archive /> {exporting === 'full' ? `Gerando… ${Math.round(progress)}%` : 'Exportar todos os dados'}
          </Button>
          <Button variant="outline" onClick={() => doExport('recordings')} disabled={Boolean(exporting)}>
            <FileAudio /> {exporting === 'recordings' ? `Gerando… ${Math.round(progress)}%` : 'Exportar só gravações'}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <p className="font-semibold">Importar / restaurar</p>
        <p className="mb-4 text-sm text-muted-foreground">Aceita backups completos ou só de gravações. A estrutura, a versão e os arquivos de áudio são validados antes de qualquer alteração.</p>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onFile(f)
            e.target.value = ''
          }}
        />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload /> Escolher arquivo de backup
        </Button>
      </Card>

      <Card className="border-destructive/40 p-5">
        <p className="font-semibold text-destructive">Zona de perigo</p>
        <p className="mb-4 text-sm text-muted-foreground">Apaga definitivamente perfis, registros, flashcards e gravações deste navegador.</p>
        <Button variant="destructive" onClick={() => setClearOpen(true)}>
          Limpar todos os dados
        </Button>
      </Card>

      <Dialog open={Boolean(parsed)} onOpenChange={(o) => !o && !importing && setParsed(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar backup</DialogTitle>
            <DialogDescription>
              {parsed && (
                <>
                  {parsed.manifest.kind === 'full' ? 'Backup completo' : 'Backup de gravações'} de {formatShort(parsed.manifest.exportedAt.slice(0, 10))} · formato v{parsed.manifest.formatVersion}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {parsed && (
            <div className="flex flex-col gap-3 text-sm">
              <ul className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-3 text-xs">
                {Object.entries(parsed.manifest.counts)
                  .filter(([, n]) => n)
                  .map(([t, n]) => (
                    <li key={t} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{t}</span>
                      <span className="tabular">{n}</span>
                    </li>
                  ))}
                <li className="flex justify-between gap-2">
                  <span className="text-muted-foreground">arquivos de áudio</span>
                  <span className="tabular">{parsed.manifest.audioFiles.length}</span>
                </li>
              </ul>
              {parsed.warnings.map((w) => (
                <p key={w} className="text-warning">
                  ⚠ {w}
                </p>
              ))}
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Modo de importação">
                {(
                  [
                    ['merge', 'Mesclar sem duplicar', 'Adiciona apenas registros que ainda não existem. Os perfis são associados pelo participante 1/2.'],
                    ['replace', 'Substituir', parsed.manifest.kind === 'full' ? 'Apaga todos os dados atuais e restaura o backup.' : 'Apaga as gravações atuais e restaura as do backup.'],
                  ] as const
                ).map(([m, label, hint]) => (
                  <label key={m} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${mode === m ? 'border-foreground/40 bg-muted' : ''}`}>
                    <input type="radio" name="import-mode" checked={mode === m} onChange={() => setMode(m)} className="mt-1 accent-[var(--brand)]" />
                    <span>
                      <span className="font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={importing} onClick={() => setParsed(undefined)}>
              Cancelar
            </Button>
            <Button variant={mode === 'replace' ? 'destructive' : 'default'} disabled={importing} onClick={doImport}>
              <Download /> {importing ? 'Importando…' : mode === 'replace' ? 'Substituir dados' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={(o) => {
          setClearOpen(o)
          if (!o) setConfirmText('')
        }}
        title="Apagar todos os dados?"
        description="Essa ação é definitiva. Exporte um backup antes se quiser guardar algo. Digite APAGAR para confirmar."
        confirmLabel="Apagar tudo"
        destructive
        confirmDisabled={confirmText !== 'APAGAR'}
        onConfirm={async () => {
          await clearAllData()
          toast.success('Dados apagados.')
        }}
      >
        <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="APAGAR" aria-label="Digite APAGAR para confirmar" />
      </ConfirmDialog>
    </div>
  )
}
