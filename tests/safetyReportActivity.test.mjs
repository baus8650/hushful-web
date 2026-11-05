import test from 'node:test'
import assert from 'node:assert/strict'
import { safetyReportsForActivity } from '../src/safetyReportActivity.ts'

const report = { id: 'report-1', reporterID: 'reporter', targetType: 'item_note', reason: 'other', createdAt: '2026-10-31T09:00:00Z' }
const activity = { kind: 'safety_report_submitted', actorID: 'reporter', message: 'A item_note was reported for other.', createdAt: '2026-10-31T09:00:01Z' }

test('older safety activity opens the original report', () => {
  const unrelated = { ...report, id: 'unrelated', reporterID: 'another-user' }
  assert.deepEqual(safetyReportsForActivity([unrelated, report], activity).map((value) => value.id), ['report-1'])
})

test('new report ID takes precedence over legacy metadata', () => {
  assert.deepEqual(safetyReportsForActivity([report], { ...activity, reportID: 'report-1', actorID: 'different', message: '' }), [report])
})

test('does not select unrelated types, reasons, or times', () => {
  assert.deepEqual(safetyReportsForActivity([
    { ...report, targetType: 'account' },
    { ...report, reason: 'spam' },
    { ...report, createdAt: '2026-10-30T09:00:00Z' },
    { ...report, createdAt: undefined },
  ], activity), [])
})

test('guest reports match and ambiguous results are kept for review', () => {
  const guest = { ...report, reporterID: undefined }
  assert.equal(safetyReportsForActivity([guest, { ...guest, id: 'second' }], { ...activity, actorID: undefined }).length, 2)
})
