import test from 'node:test'
import assert from 'node:assert/strict'
import { groupAudienceMembers } from '../src/sharingAudience.ts'

const groups = [
  { id: 'family', members: [{ id: 'shared' }, { id: 'family-only' }] },
  { id: 'friends', members: [{ id: 'shared' }] },
]

test('selecting and deselecting a group adds and removes inherited friend selections', () => {
  assert.deepEqual([...groupAudienceMembers(groups, ['family'])].sort(), ['family-only', 'shared'])
  assert.equal(groupAudienceMembers(groups, []).size, 0)
})

test('overlapping groups keep a friend inherited until the last selected group is removed', () => {
  assert.equal(groupAudienceMembers(groups, ['family', 'friends']).size, 2)
  assert.deepEqual([...groupAudienceMembers(groups, ['friends'])], ['shared'])
  assert.equal(groupAudienceMembers(groups, []).size, 0)
})

test('inherited selections never become persistent individual grants', () => {
  const audience = { userIDs: ['individually-shared'], groupIDs: ['family'] }
  const before = JSON.stringify(audience)
  const inherited = groupAudienceMembers(groups, audience.groupIDs)
  assert.equal(inherited.has('shared'), true)
  assert.equal(JSON.stringify(audience), before)
  audience.groupIDs = []
  assert.equal(groupAudienceMembers(groups, audience.groupIDs).size, 0)
  assert.deepEqual(audience.userIDs, ['individually-shared'])
})
