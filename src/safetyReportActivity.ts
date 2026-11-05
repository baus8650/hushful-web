import type { ActivityItem, UserReport } from './types'

export function safetyReportsForActivity(reports: UserReport[], activity: ActivityItem): UserReport[] {
  if (activity.reportID) return reports.filter((report) => report.id === activity.reportID)
  return reports.filter((report) => {
    const delay = Date.parse(activity.createdAt || '') - Date.parse(report.createdAt || '')
    const summary = `A ${report.targetType || 'account'} was reported for ${report.reason.replaceAll('_', ' ')}.`
    return (report.reporterID || null) === (activity.actorID || null) && delay >= -2000 && delay <= 120000 && activity.message === summary
  })
}
