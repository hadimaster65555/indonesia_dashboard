import type { ColumnDef } from '@tanstack/react-table'
import { MapPinned } from 'lucide-react'

import type { RegionalPriorityRow } from '@/server/dashboard'
import { formatValue } from '@/lib/format'
import { DataTable } from './DataTable'

type RegionalMapProps = {
  regions: RegionalPriorityRow[]
}

function toPoint(region: RegionalPriorityRow) {
  const lon = region.longitude ?? 118
  const lat = region.latitude ?? -2
  return {
    x: ((lon - 94) / (142 - 94)) * 100,
    y: ((6 - lat) / (6 - -11)) * 100,
  }
}

const columns: ColumnDef<RegionalPriorityRow>[] = [
  {
    accessorKey: 'name',
    header: 'Province',
    cell: ({ row }) => <span className="font-medium text-zinc-900">{row.original.name}</span>,
  },
  {
    accessorKey: 'score',
    header: 'Priority',
    cell: ({ row }) => formatValue(row.original.score, 'score'),
  },
  {
    accessorKey: 'budgetAbsorption',
    header: 'Budget',
    cell: ({ row }) => formatValue(row.original.budgetAbsorption, '%'),
  },
  {
    accessorKey: 'povertyRate',
    header: 'Poverty',
    cell: ({ row }) => formatValue(row.original.povertyRate, '%'),
  },
]

export function RegionalMap({ regions }: RegionalMapProps) {
  const topRegions = regions.slice(0, 10)

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <MapPinned className="h-5 w-5 text-teal-700" />
          <h2 className="text-sm font-semibold text-zinc-950">Regional Intervention Map</h2>
        </div>
        <div className="relative aspect-[16/8] min-h-80 overflow-hidden rounded-md bg-[#eef5f2]">
          <svg viewBox="0 0 100 52" className="h-full w-full" role="img" aria-label="Indonesia province risk map">
            <path
              d="M8 25 C18 17, 28 18, 39 26 S60 32, 70 24 S87 20, 96 28"
              fill="none"
              stroke="#a7c7bc"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.45"
            />
            <path
              d="M14 33 C30 36, 38 39, 52 35 S74 34, 88 41"
              fill="none"
              stroke="#d6b36a"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.35"
            />
            {topRegions.map((region) => {
              const point = toPoint(region)
              const radius = Math.max(2.4, Math.min(7.5, region.score / 13))
              return (
                <g key={region.code}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={radius}
                    fill={region.score > 78 ? '#dc2626' : region.score > 66 ? '#d97706' : '#0f766e'}
                    opacity="0.86"
                  />
                  {region.score > 72 ? (
                    <text x={point.x + radius + 1} y={point.y + 1} fontSize="2.4" fill="#3f3f46">
                      {region.name}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </svg>
        </div>
      </div>
      <DataTable data={regions.slice(0, 12)} columns={columns} emptyLabel="No regional scores" />
    </section>
  )
}
