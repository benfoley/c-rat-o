export const CHART_PALETTE = [
  '#2f5233',
  '#c98a17',
  '#3b6ea5',
  '#c1443b',
  '#7a5195',
  '#5aa469',
  '#a05a2c',
  '#4b7d99',
]

export function colorForIndex(i: number): string {
  return CHART_PALETTE[i % CHART_PALETTE.length]
}
