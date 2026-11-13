/**
 * Barramento mínimo de eventos: os repositories avisam quando dados "de origem" mudam
 * para que o motor de jogo recalcule pontuação, conquistas, temporadas e recompensas.
 */
type Listener = () => void

const listeners = new Set<Listener>()

export function onDataChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitDataChange() {
  for (const l of listeners) l()
}
