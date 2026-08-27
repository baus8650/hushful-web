export interface TokenResponse { accessToken: string; tokenType: string; expiresIn: number }
export interface CurrentUser { id: string; email: string; displayName?: string }
export interface Wishlist { id: string; title: string }
export interface WishlistItem {
  id: string; title: string; url?: string; price?: number; ownerNote?: string; quantity?: number;
  createdAt: string; updatedAt: string; wishlist: { id: string }
}
export interface SharedWishlist { shareToken: string; title: string; sharedByName?: string; accountShareID?: string; wishlistID?: string }
export interface AccountSharedWishlist { id: string; wishlistID: string; title: string; sharedByName: string }
export interface SharedNote { authorDisplayName?: string; updatedAt?: string; note: string }
export interface SharedItemRow {
  purchasedByMe: boolean; purchased: boolean; purchasedQuantity?: number; purchasedQuantityByMe?: number; notes: SharedNote[];
  item: WishlistItem
}
export interface ShareViewResponse {
  viewerToken: string
  wishlist: { id: string; title: string; sharedByName: string }
}
