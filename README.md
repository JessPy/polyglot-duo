# Polyglot Duo

Plataforma pessoal para um casal acompanhar e competir de forma saudável no aprendizado de idiomas (espanhol × inglês).
100% no navegador: sem backend, sem login, sem IA e sem custos recorrentes.

## Rodando

```bash
npm install
npm run dev        # desenvolvimento
npm test           # testes unitários das regras de negócio (Vitest)
npm run build      # gera o site estático em dist/
npm run preview    # serve o build localmente
```

O build é um site estático (hash router + `base: './'`), então pode ser publicado em GitHub Pages, Netlify, Vercel ou qualquer hospedagem estática. A gravação de áudio exige **HTTPS** (ou `localhost`).

## Arquitetura

```
src/
  app/            rotas (hash router, páginas com lazy loading) e App raiz
  components/ui   design system (padrão shadcn/ui sobre Radix + Tailwind)
  components/     layout, gráficos (Recharts) e componentes compartilhados
  features/       uma pasta por página (dashboard, study, vocabulary, challenges, speaking, battle, ...)
  hooks/          hooks de dados reativos, gravador (MediaRecorder), tema, timer, motor de jogo
  lib/            regras de negócio puras e testadas (pontuação, SRS, gamificação, temporadas, CSV, datas)
  db/             schema Dexie, migrations versionadas e barramento de eventos
  repositories/   única camada que acessa o IndexedDB
  services/       motor de jogo, backup/restauração, onboarding
  data/           catálogo local de desafios (por idioma e nível)
  store/          Zustand: preferências simples (tema, perfil ativo) no localStorage
```

Fluxo: UI → hooks → repositories → Dexie (IndexedDB). Toda mutação emite um evento; o **motor de jogo** (`services/gameEngine.ts`) recalcula de forma idempotente o placar semanal, fecha temporadas, libera recompensas e desbloqueia conquistas.

## Regras de pontuação (até 100 pts/semana)

| Categoria   | Meta padrão                 | Pontos |
|-------------|-----------------------------|--------|
| Vocabulário | 25 palavras aprendidas      | 20     |
| Speaking    | 3 sessões de ≥ 10 min       | 25     |
| Listening   | 100 minutos                 | 20     |
| Writing     | 3 textos de ≥ 100 palavras  | 15     |
| Retenção    | 80% de acertos nas revisões | 20     |

- Pontos proporcionais: `pontos × min(1, alcançado / meta)`. A comparação é pelo cumprimento das **metas pessoais**.
- Retenção exige pelo menos 10 revisões na semana para valer a pontuação cheia (proporcional abaixo disso).
- Semanas vão de segunda a domingo no fuso local. Metas são versionadas: mudar metas vale a partir da semana atual.
- Uma gravação ou desafio gera no máximo uma atividade (sem pontos duplicados). Editar/excluir recalcula tudo.
- Palavras aprendidas = flashcards com 3 acertos seguidos (contados uma única vez) + palavras registradas em atividades de vocabulário.

## Flashcards

SM-2 simplificado (estilo Anki), documentado em `src/lib/srs.ts`. Importação/exportação CSV com colunas `term, translation, example, category` (aceita cabeçalho em português e `;`).

## Gamificação

- **XP** derivado dos registros (`lib/gamification.ts`), níveis de jogo (Semente → Lenda), independentes do CEFR.
- **Streak**, **8 conquistas**, **temporadas** de 30/60/90 dias (vence quem somar mais pontos semanais; desempate por duelos).
- **Recompensas** com condição: vencedor da semana, do mês, da temporada, meta conjunta (ambos ≥ 80 pts) ou liberação manual.

## Dados, gravações e backup

- Áudios são guardados como `Blob` no formato nativo do navegador (sem Base64), em tabela separada.
- **IndexedDB é local ao navegador/dispositivo**: nada sincroniza entre aparelhos e tudo pode ser perdido se os dados do navegador forem limpos. Faça backups em *Configurações → Dados*.
- Backup = ZIP versionado: `manifest.json` (app, tipo, formatVersion, schemaVersion, contagens, lista de áudios), `data.json` e `audio/<id>.<ext>`.
- Importação valida estrutura, versão e arquivos antes de alterar qualquer coisa. Modos: **substituir** ou **mesclar sem duplicar** (perfis são associados por participante 1/2, útil para juntar dados de dois aparelhos).
