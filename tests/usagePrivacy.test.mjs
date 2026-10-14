import test from 'node:test'
import assert from 'node:assert/strict'
import { safeUsagePath } from '../src/usagePrivacyRules.ts'
test('analytics paths discard share tokens, queries, fragments and unknown content', () => {
  assert.equal(safeUsagePath('/share/very-private-token?x=secret'), '/share')
  assert.equal(safeUsagePath('/reset-password?resetToken=secret#private'), '/reset-password')
  assert.equal(safeUsagePath('/private-list/name-and-secret'), '/')
  assert.equal(safeUsagePath('/app/wishlist'), '/app/wishlist')
  assert.equal(safeUsagePath('/privacy/'), '/privacy')
  assert.equal(safeUsagePath('/safety'), '/community-safety')
})
