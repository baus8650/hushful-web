import test from 'node:test'
import assert from 'node:assert/strict'
import { activeOwnedListCount, canCreateWishlist } from '../src/proAccess.ts'

test('Free permits the first three active lists and blocks the fourth', () => {
  assert.equal(canCreateWishlist(false, []), true)
  assert.equal(canCreateWishlist(false, [{}, {}]), true)
  assert.equal(canCreateWishlist(false, [{}, {}, {}]), false)
  assert.equal(canCreateWishlist(false, [{}, {}, {}, {}]), false)
})

test('Archived and other owners’ lists do not consume a free slot', () => {
  const lists = [{}, {}, { isArchived: true }, { isPrimaryOwner: false }, { isCollaborative: true, isPrimaryOwner: false }]
  assert.equal(activeOwnedListCount(lists), 2)
  assert.equal(canCreateWishlist(false, lists), true)
  // A primary-owned collaborative list still counts, exactly as on iOS.
  lists.push({ isCollaborative: true, isPrimaryOwner: true })
  assert.equal(canCreateWishlist(false, lists), false)
})

test('Pro removes the cap; losing Pro preserves lists but prevents additions', () => {
  const lists = Array.from({ length: 8 }, () => ({}))
  assert.equal(canCreateWishlist(true, lists), true)
  assert.equal(canCreateWishlist(false, lists), false)
  assert.equal(lists.length, 8)
})
