import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { MetricPoint } from '@/server/dashboard'
import { formatDate, formatValue } from '@/lib/format'

type TrendChartProps = {
  title: string
  points: MetricPoint[]
  color?: string
}

export function TrendChart({ title, points, color = '#0f766e' }: TrendChartProps) {
  const unit = points.at(-1)?.unit
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <span className="text-xs text-zinc-500">{points.length} periods</span>
      </div>
      <div className="h-64 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`fill-${title.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="periodEnd"
                tickFormatter={(value) => formatDate(value).replace(/\s\d{4}/, '')}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => formatValue(Number(value), unit)}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip
                formatter={(value) => [formatValue(Number(value), unit), unit ?? 'value']}
                labelFormatter={(value) => formatDate(String(value))}
                contentStyle={{ borderRadius: 8, borderColor: '#d4d4d8' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#fill-${title.replace(/\W/g, '')})`}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-end gap-2 rounded-md bg-zinc-50 px-3 py-4">
            {points.slice(-8).map((point) => {
              const max = Math.max(...points.map((item) => item.value), 1)
              const height = Math.max(12, (point.value / max) * 100)
              return (
                <div
                  key={`${point.periodEnd}-${point.value}`}
                  className="flex-1 rounded-t"
                  style={{ height: `${height}%`, backgroundColor: color, opacity: 0.22 }}
                />
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
