export interface TokenResponse { accessToken: string; tokenType: string; expiresIn: number }
export interface CurrentUser { id: string; email: string; displayName?: string; username?: string; isDiscoverable: boolean; friendRequestPolicy: 'everyone' | 'nobody'; hasAvatar: boolean; isPro?: boolean }
export interface SocialUser { id: string; username: string; displayName?: string; hasAvatar: boolean }
export interface Friendship { id: string; user: SocialUser; direction: 'incoming' | 'outgoing'; status: 'pending' | 'accepted' }
export interface FriendGroup { id: string; name: string; members: SocialUser[] }
export interface WishlistAudience { userIDs: string[]; groupIDs: string[] }
export interface ActivityItem { id: string; kind: string; title: string; message: string; actorID?: string; wishlistID?: string; readAt?: string; createdAt?: string }
export interface Wishlist {
  id: string; title: string; visibility: 'private' | 'public'; collaborationMode?: 'our_wishlist' | 'gift_planning';
  isPrimaryOwner?: boolean; isCollaborative?: boolean; occasionDate?: string; reminderEnabled?: boolean;
  icon?: string; colorTheme?: string; isArchived?: boolean
}
export interface WishlistCollaborator { id: string; displayName?: string; username?: string; isPrimaryOwner: boolean }
export interface WishlistCollaboration { mode: 'our_wishlist' | 'gift_planning'; collaborators: WishlistCollaborator[] }
export interface WishlistSettings {
  visibility: 'private' | 'public'; showPurchaserNames: boolean; allowMultiplePurchases: boolean;
  allowNotes: boolean; autoLockOnPurchase: boolean; occasionDate?: string; reminderEnabled?: boolean;
  icon?: string; colorTheme?: string; isArchived?: boolean
}
export interface ProfileWishlist { wishlistID: string; title: string; accountShareID?: string }
export interface FriendProfile { user: SocialUser; publicWishlists: ProfileWishlist[]; sharedWishlists: ProfileWishlist[] }
export interface Pins { wishlistIDs: string[]; userIDs: string[]; groupIDs: string[] }
export interface WishlistItem {
  id: string; title: string; url?: string; price?: number; ownerNote?: string; quantity?: number;
  createdAt: string; updatedAt: string; wishlist: { id: string }
}
export interface SharedWishlist { shareToken: string; title: string; sharedByName?: string; accountShareID?: string; wishlistID?: string }
export interface AccountSharedWishlist { id: string; wishlistID: string; title: string; sharedByName: string }
export interface SharedNote { authorDisplayName?: string; updatedAt?: string; note: string; isMine?: boolean }
export interface SharedItemRow {
  purchasedByMe: boolean; purchased: boolean; purchasedQuantity?: number; purchasedQuantityByMe?: number; notes: SharedNote[];
  item: WishlistItem
}
export interface ShareViewResponse {
  viewerToken: string
  wishlist: { id: string; title: string; sharedByName: string }
}
