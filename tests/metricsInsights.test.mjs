import test from 'node:test'
import assert from 'node:assert/strict'
import { weeklyComparison, dailyCSV } from '../src/metricsInsights.ts'
const days = (counts) => counts.map((count,index) => ({ date: `2026-10-${String(index+1).padStart(2,'0')}`, pageViews: count, appOpens: 0, appStoreClicks: 0, newAccounts: 0, recordedUpdates: 0 }))
test('weekly comparison compares equal seven-day windows and handles a zero baseline', () => {
  assert.equal(weeklyComparison(days([1,2,3]),'pageViews'), null)
  assert.deepEqual(weeklyComparison(days([...Array(7).fill(2), ...Array(7).fill(3), 999]),'pageViews'), { current: 21, previous: 14, percent: 50 })
  assert.deepEqual(weeklyComparison(days([...Array(7).fill(0), ...Array(7).fill(1), 999]),'pageViews'), { current: 7, previous: 0, percent: null })
})
test('CSV exports complete daily totals including zero days', () => {
  const csv = dailyCSV(days([0,4]))
  assert.equal(csv.split('\n').length,3)
  assert.ok(csv.includes('2026-10-01,0,0,0,0,0'))
  assert.ok(csv.includes('2026-10-02,4,0,0,0,0'))
})
