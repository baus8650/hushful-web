import type { FriendGroup } from './types'

// Keep group-derived access separate from direct grants so deselecting the last
// group removes inherited access without losing an intentional individual share.
export function groupAudienceMembers(groups: FriendGroup[], selectedIDs: string[]): Set<string> {
  const selected = new Set(selectedIDs)
  return new Set(groups.filter((group) => selected.has(group.id)).flatMap((group) => group.members.map((member) => member.id)))
}
