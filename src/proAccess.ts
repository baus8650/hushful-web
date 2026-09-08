import type { Wishlist } from './types'

// Matches iOS WishlistsView.activeOwnedListCount and the API's ProAccessService.
export const FREE_LIST_LIMIT = 3
export const activeOwnedListCount = (lists: Wishlist[]) => lists.filter((list) => list.isPrimaryOwner !== false && !list.isArchived).length
export const canCreateWishlist = (isPro: boolean, lists: Wishlist[]) => isPro || activeOwnedListCount(lists) < FREE_LIST_LIMIT
