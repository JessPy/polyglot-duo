import { Award, Gift, Lock, Pause, Pencil, Play, Plus, Trash2, Trophy, Unlock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PageHeader, PageTransition, SectionTitle } from '@/components/shared/Page'
import { ParticipantAvatar } from '@/components/shared/ParticipantAvatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Badge, Progress, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/misc'
import { useAction } from '@/hooks/useAsync'
import { useAllStats, useDataBundle } from '@/hooks/useData'
import { pColor } from '@/hooks/useParticipantColors'
import { useToday } from '@/hooks/useToday'
import { useLiveQuery } from 'dexie-react-hooks'
import { seasonPoints } from '@/lib/competition'
import { REWARD_CATEGORIES, REWARD_CONDITIONS, SEASON_LENGTHS } from '@/lib/constants'
import { diffDays, formatDuration, formatShort, toDateKey } from '@/lib/dates'
import { ACHIEVEMENTS } from '@/lib/gamification'
import { achievementsRepo, rewardsRepo, seasonsRepo, type RewardInput } from '@/repositories'
import type { AchievementKey, Reward, RewardCondition, Season } from '@/types'

export default function RewardsPage() {
  const bundle = useDataBundle()
  const stats = useAllStats(bundle)
  const today = useToday()
  const rewards = useLiveQuery(() => rewardsRepo.list(), [])
  const unlocks = useLiveQuery(() => rewardsRepo.listUnlocks(), [])
  const achievements = useLiveQuery(() => achievementsRepo.list(), [])
  const [editing, setEditing] = useState<Reward | null>()
  const [deleting, setDeleting] = useState<Reward>()
  const [manual, setManual] = useState<Reward>()
  const [endingSeason, setEndingSeason] = useState<Season>()
  const [seasonForm, setSeasonForm] = useState({ name: '', length: 90 as Season['lengthDays'], start: today })

  const removeReward = useAction((id: string) => rewardsRepo.remove(id), 'Recompensa excluída.')
  const toggle = useAction((r: Reward) => rewardsRepo.update(r.id, { status: r.status === 'active' ? 'paused' : 'active' }))
  const redeem = useAction((id: string, v: boolean) => rewardsRepo.setRedeemed(id, v))
  const createSeason = useAction(() => seasonsRepo.create(seasonForm.length, seasonForm.start, seasonForm.name), 'Temporada criada!')
  const endSeason = useAction((id: string) => seasonsRepo.endNow(id), 'Temporada encerrada.')

  if (!bundle || !stats || !rewards || !unlocks || !achievements) return <LoadingState />
  const { participants } = bundle
  const name = (id?: string) => (id === 'both' ? 'Vocês dois' : id === 'tie' ? 'Empate' : (participants.find((p) => p.id === id)?.name ?? '—'))
  const activeSeason = bundle.seasons.find((s) => s.status === 'active')
  const pastSeasons = bundle.seasons.filter((s) => s.status === 'completed').sort((a, b) => b.endDate.localeCompare(a.endDate))
  const periodLabel = (k: string) => (k.startsWith('W') ? `Semana de ${formatShort(k.slice(1))}` : k.startsWith('M') ? `Mês ${k.slice(1)}` : k.startsWith('S') ? `Temporada: ${bundle.seasons.find((s) => s.id === k.slice(1))?.name ?? ''}` : 'Liberação manual')

  return (
    <PageTransition>
      <PageHeader title="Recompensas" icon={Gift} description="Competição e colaboração: prêmios para quem vence e para quando os dois mandam bem." />
      <Tabs defaultValue="rewards">
        <TabsList>
          <TabsTrigger value="rewards">
            <Gift className="size-4" /> Recompensas
          </TabsTrigger>
          <TabsTrigger value="seasons">
            <Trophy className="size-4" /> Temporadas
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Award className="size-4" /> Conquistas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="flex flex-col gap-8">
          <section>
            <SectionTitle
              action={
                <Button size="sm" onClick={() => setEditing(null)}>
                  <Plus /> Nova recompensa
                </Button>
              }
            >
              Catálogo
            </SectionTitle>
            {rewards.length === 0 ? (
              <EmptyState icon={Gift} title="Nenhuma recompensa" description="Ex.: escolher o filme (semanal), jantar especial (mensal), viagem curta (temporada)." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {rewards.map((r) => (
                  <Card key={r.id} className={`flex flex-col gap-2 p-4 ${r.status === 'paused' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{r.title}</p>
                        {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                      </div>
                      <div className="flex shrink-0">
                        <Button variant="ghost" size="icon-sm" aria-label={r.status === 'active' ? 'Pausar' : 'Ativar'} title={r.status === 'active' ? 'Pausar' : 'Ativar'} onClick={() => toggle.run(r)}>
                          {r.status === 'active' ? <Pause /> : <Play />}
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setEditing(r)}>
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Excluir" onClick={() => setDeleting(r)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="brand">{REWARD_CATEGORIES[r.category]}</Badge>
                      <Badge variant="outline">
                        <Lock className="size-3" /> {REWARD_CONDITIONS[r.condition].label}
                      </Badge>
                      {r.status === 'paused' && <Badge>Pausada</Badge>}
                    </div>
                    {r.condition === 'manual' && r.status === 'active' && (
                      <Button size="sm" variant="outline" className="self-start" onClick={() => setManual(r)}>
                        <Unlock /> Liberar agora
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle>Desbloqueadas</SectionTitle>
            {unlocks.length === 0 ? (
              <Card className="p-5 text-sm text-muted-foreground">Nada desbloqueado ainda. Recompensas semanais são liberadas quando a semana termina; a conjunta, assim que os dois fazem 80+ pontos.</Card>
            ) : (
              <Card className="divide-y">
                {unlocks.map((u) => {
                  const r = rewards.find((x) => x.id === u.rewardId)
                  const p = participants.find((x) => x.id === u.winnerId)
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-4">
                      {p ? <ParticipantAvatar participant={p} size="sm" /> : <span className="text-xl">👫</span>}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{r?.title ?? 'Recompensa removida'}</p>
                        <p className="text-xs text-muted-foreground">
                          {name(u.winnerId)} · {periodLabel(u.periodKey)} · liberada em {formatShort(toDateKey(new Date(u.unlockedAt)))}
                        </p>
                      </div>
                      <Button size="sm" variant={u.redeemedAt ? 'secondary' : 'outline'} onClick={() => redeem.run(u.id, !u.redeemedAt)}>
                        {u.redeemedAt ? '✓ Resgatada' : 'Marcar resgatada'}
                      </Button>
                    </div>
                  )
                })}
              </Card>
            )}
          </section>
        </TabsContent>

        <TabsContent value="seasons" className="flex flex-col gap-8">
          {activeSeason ? (
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{activeSeason.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatShort(activeSeason.startDate)} a {formatShort(activeSeason.endDate)} · {activeSeason.lengthDays} dias · faltam {Math.max(0, diffDays(today, activeSeason.endDate))} dias
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEndingSeason(activeSeason)}>
                  Encerrar agora
                </Button>
              </div>
              <Progress className="mt-4" value={((diffDays(activeSeason.startDate, today) + 1) / activeSeason.lengthDays) * 100} color="var(--brand)" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <ParticipantAvatar participant={p} />
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="tabular text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
                        {seasonPoints(activeSeason, bundle.weeklyScores, p.id)} <span className="text-sm font-normal text-muted-foreground">pts</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Pontuação = soma dos pontos semanais da temporada. Desempate: duelos vencidos.</p>
            </Card>
          ) : (
            <Card className="p-5">
              <p className="mb-4 font-semibold">Nova temporada</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Nome" htmlFor="s-name">
                  <Input id="s-name" placeholder={`Temporada ${bundle.seasons.length + 1}`} value={seasonForm.name} onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })} />
                </Field>
                <Field label="Duração" htmlFor="s-len">
                  <NativeSelect id="s-len" value={seasonForm.length} onChange={(e) => setSeasonForm({ ...seasonForm, length: Number(e.target.value) as Season['lengthDays'] })}>
                    {SEASON_LENGTHS.map((l) => (
                      <option key={l} value={l}>
                        {l} dias
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Início" htmlFor="s-start">
                  <Input id="s-start" type="date" value={seasonForm.start} onChange={(e) => setSeasonForm({ ...seasonForm, start: e.target.value })} />
                </Field>
              </div>
              <Button className="mt-4" onClick={() => createSeason.run()} disabled={createSeason.pending || !seasonForm.start}>
                <Plus /> Iniciar temporada
              </Button>
            </Card>
          )}

          <section>
            <SectionTitle>Histórico de temporadas</SectionTitle>
            {pastSeasons.length === 0 ? (
              <Card className="p-5 text-sm text-muted-foreground">As temporadas concluídas aparecem aqui com vencedor e estatísticas.</Card>
            ) : (
              <div className="flex flex-col gap-3">
                {pastSeasons.map((s) => (
                  <Card key={s.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatShort(s.startDate)} a {formatShort(s.endDate)}
                        </p>
                      </div>
                      <Badge variant="warning">🏆 {name(s.winnerId)}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {participants.map((p) => {
                        const st = s.stats?.[p.id]
                        return (
                          <div key={p.id} className="rounded-lg bg-muted/60 p-3 text-sm">
                            <p className="font-medium">
                              {p.avatar} {p.name}: <span className="tabular">{s.finalScores?.[p.id] ?? 0} pts</span>
                            </p>
                            {st && (
                              <p className="text-xs text-muted-foreground">
                                {formatDuration(st.minutes)} · {st.studyDays} dias · {st.words} palavras · {st.battlesWon} duelos
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="achievements">
          <div className="grid gap-6 lg:grid-cols-2">
            {participants.map((p) => {
              const st = stats[p.id]
              return (
                <section key={p.id}>
                  <div className="mb-3 flex items-center gap-2">
                    <ParticipantAvatar participant={p} size="sm" />
                    <span className="font-semibold">{p.name}</span>
                    <Badge variant="brand">
                      Nível {st.level.level} · {st.level.title}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(ACHIEVEMENTS) as AchievementKey[]).map((k) => {
                      const def = ACHIEVEMENTS[k]
                      const unlocked = achievements.find((a) => a.id === `${p.id}_${k}`)
                      const [cur, max] = def.progress(st.achievementStats)
                      return (
                        <Card key={k} className={`flex flex-col gap-1.5 p-3 ${unlocked ? '' : 'opacity-60'}`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl ${unlocked ? '' : 'grayscale'}`} aria-hidden>
                              {def.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{def.title}</p>
                              <p className="text-xs text-muted-foreground">{def.description}</p>
                            </div>
                          </div>
                          {unlocked ? (
                            <p className="text-xs text-success">Desbloqueada em {formatShort(toDateKey(new Date(unlocked.unlockedAt)))}</p>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Progress value={(cur / max) * 100} color={pColor(p)} className="h-1.5" />
                              <span className="tabular text-[11px] text-muted-foreground">
                                {cur}/{max}
                              </span>
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      <RewardDialog reward={editing} onClose={() => setEditing(undefined)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Excluir recompensa?"
        description="Os desbloqueios desta recompensa também serão removidos."
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (deleting) await removeReward.run(deleting.id)
        }}
      />
      <ConfirmDialog
        open={Boolean(endingSeason)}
        onOpenChange={(o) => !o && setEndingSeason(undefined)}
        title="Encerrar temporada agora?"
        description="A data final passa a ser hoje e o vencedor é calculado com os pontos até aqui."
        confirmLabel="Encerrar"
        onConfirm={async () => {
          if (endingSeason) await endSeason.run(endingSeason.id)
        }}
      />
      <Dialog open={Boolean(manual)} onOpenChange={(o) => !o && setManual(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar “{manual?.title}”</DialogTitle>
            <DialogDescription>Para quem é esta recompensa?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {[...participants.map((p) => ({ id: p.id, label: `${p.avatar} ${p.name}` })), { id: 'both', label: '👫 Os dois' }].map((o) => (
              <Button
                key={o.id}
                variant="outline"
                onClick={async () => {
                  if (manual) await rewardsRepo.unlockManually(manual.id, o.id)
                  setManual(undefined)
                }}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}

function RewardDialog({ reward, onClose }: { reward: Reward | null | undefined; onClose: () => void }) {
  const open = reward !== undefined
  const [form, setForm] = useState<RewardInput>({ title: '', description: '', condition: 'weekly_winner' })
  useEffect(() => {
    if (open) setForm(reward ? { title: reward.title, description: reward.description, condition: reward.condition } : { title: '', description: '', condition: 'weekly_winner' })
  }, [open, reward])
  const save = useAction(async () => {
    if (reward) await rewardsRepo.update(reward.id, form)
    else await rewardsRepo.add(form)
  }, 'Recompensa salva.')
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reward ? 'Editar recompensa' : 'Nova recompensa'}</DialogTitle>
          <DialogDescription>Defina o prêmio e a condição de desbloqueio.</DialogDescription>
        </DialogHeader>
        <Field label="Título" htmlFor="rw-t">
          <Input id="rw-t" value={form.title} maxLength={80} placeholder="Ex.: Escolher o jantar" onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Descrição" htmlFor="rw-d">
          <Textarea id="rw-d" value={form.description} maxLength={300} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="Condição de desbloqueio" htmlFor="rw-c" hint={REWARD_CONDITIONS[form.condition].hint}>
          <NativeSelect id="rw-c" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as RewardCondition })}>
            {(Object.keys(REWARD_CONDITIONS) as RewardCondition[]).map((c) => (
              <option key={c} value={c}>
                {REWARD_CONDITIONS[c].label} ({REWARD_CATEGORIES[REWARD_CONDITIONS[c].category]})
              </option>
            ))}
          </NativeSelect>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={save.pending || !form.title.trim()} onClick={async () => (await save.run()) && onClose()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
