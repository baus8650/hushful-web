import type { UsageDay } from './usageMetrics'
export type TrafficMetric = keyof Omit<UsageDay, 'date'>
export const metricLabels: Record<TrafficMetric, string> = { pageViews: 'Website views', appOpens: 'App opens', appStoreClicks: 'App Store clicks', newAccounts: 'New accounts', recordedUpdates: 'Items created' }
export function weeklyComparison(daily: UsageDay[], metric: TrafficMetric) {
  const completed = daily.slice(0,-1)
  if (completed.length < 14) return null
  const sum = (rows: UsageDay[]) => rows.reduce((total, day) => total + day[metric], 0)
  const current = sum(completed.slice(-7)), previous = sum(completed.slice(-14,-7))
  return { current, previous, percent: previous ? (current - previous) / previous * 100 : null }
}
export function dailyCSV(daily: UsageDay[]) {
  return ['Date (UTC),Website views,App opens,App Store clicks,New accounts,Items created', ...daily.map(day => [day.date, day.pageViews, day.appOpens, day.appStoreClicks, day.newAccounts, day.recordedUpdates].join(','))].join('\n')
}
