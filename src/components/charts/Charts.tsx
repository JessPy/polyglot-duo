import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { pColor } from '@/hooks/useParticipantColors'
import type { ChartRow } from '@/lib/chartData'
import type { Participant } from '@/types'
import { ChartTooltip, axisProps, gridProps } from './ChartKit'

/**
 * Gráficos comparativos entre os dois participantes.
 * Cada série usa a cor do participante; nomes aparecem na legenda e no tooltip,
 * então a cor nunca é a única forma de identificação.
 */

interface Props {
  data: ChartRow[]
  participants: Participant[]
  unit?: string
  domainMax?: number
}

export function ParticipantLineChart({ data, participants, unit, domainMax }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} minTickGap={16} />
        <YAxis {...axisProps} allowDecimals={false} domain={domainMax ? [0, domainMax] : [0, 'auto']} width={44} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1, strokeDasharray: '3 3' }} />
        {participants.map((p) => (
          <Line
            key={p.id}
            type="monotone"
            dataKey={`p${p.slot}`}
            name={p.name}
            stroke={pColor(p)}
            strokeWidth={2}
            dot={data.length <= 16 ? { r: 3, fill: pColor(p), stroke: 'var(--card)', strokeWidth: 2 } : false}
            activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
            isAnimationActive
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ParticipantBarChart({ data, participants, unit, domainMax }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2} barCategoryGap="20%">
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} minTickGap={12} />
        <YAxis {...axisProps} allowDecimals={false} domain={domainMax ? [0, domainMax] : [0, 'auto']} width={44} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'var(--muted)', opacity: 0.6 }} />
        {participants.map((p) => (
          <Bar key={p.id} dataKey={`p${p.slot}`} name={p.name} fill={pColor(p)} radius={[4, 4, 0, 0]} maxBarSize={22} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function legendFor(participants: Participant[]) {
  return participants.map((p) => ({ label: p.name, color: pColor(p) }))
}
