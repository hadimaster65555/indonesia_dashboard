import clsx, { type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatValue(value: number | null | undefined, unit?: string) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'No data'
  }

  if (unit?.includes('IDR/USD')) {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)
  }

  if (unit?.includes('%')) {
    return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)}%`
  }

  if (unit === 'index' || unit === 'HHI') {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value)
  }

  if (unit?.includes('people')) {
    return new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value)
  }

  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)
}

export function formatDelta(value: number | null | undefined, unit?: string) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'No comparison'
  }

  const sign = value > 0 ? '+' : ''
  return `${sign}${formatValue(value, unit)}`
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Never'
  }
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Never'
  }
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatAgeHours(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'No run'
  }
  if (value < 1) {
    return '<1h'
  }
  if (value < 48) {
    return `${Math.round(value)}h`
  }
  return `${Math.round(value / 24)}d`
}
