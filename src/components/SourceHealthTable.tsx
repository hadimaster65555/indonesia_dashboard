import type { ColumnDef } from '@tanstack/react-table'

import type { SourceHealthRow } from '@/server/dashboard'
import { formatAgeHours, formatDateTime } from '@/lib/format'
import { DataTable } from './DataTable'
import { StatusPill } from './StatusPill'

const columns: ColumnDef<SourceHealthRow>[] = [
  {
    accessorKey: 'name',
    header: 'Source',
    cell: ({ row }) => (
      <div>
        <a href={row.original.url} target="_blank" rel="noreferrer" className="font-medium text-zinc-900">
          {row.original.name}
        </a>
        <p className="text-xs text-zinc-500">{row.original.attribution}</p>
      </div>
    ),
  },
  {
    accessorKey: 'cadence',
    header: 'Cadence',
    cell: ({ row }) => row.original.cadence.replaceAll('_', ' '),
  },
  {
    accessorKey: 'freshnessStatus',
    header: 'Freshness',
    cell: ({ row }) => (
      <StatusPill status={row.original.freshnessStatus} tone={row.original.freshnessStatus} />
    ),
  },
  {
    accessorKey: 'finishedAt',
    header: 'Last Run',
    cell: ({ row }) => formatDateTime(row.original.finishedAt),
  },
  {
    accessorKey: 'ageHours',
    header: 'Age',
    cell: ({ row }) => formatAgeHours(row.original.ageHours),
  },
  {
    accessorKey: 'rowsInserted',
    header: 'Rows',
    cell: ({ row }) => row.original.rowsInserted ?? 0,
  },
  {
    accessorKey: 'parserType',
    header: 'Parser',
    cell: ({ row }) => row.original.parserType.replaceAll('_', ' '),
  },
]

export function SourceHealthTable({ sources }: { sources: SourceHealthRow[] }) {
  return <DataTable data={sources} columns={columns} emptyLabel="No sources configured" />
}
