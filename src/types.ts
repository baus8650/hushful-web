export interface TokenResponse { accessToken: string; tokenType: string; expiresIn: number }
export interface EmailVerificationPendingResponse { email: string; verificationRequired: boolean }
export interface CurrentUser { id: string; email: string; displayName?: string; username?: string; isDiscoverable: boolean; friendRequestPolicy: 'everyone' | 'friends_of_friends' | 'nobody'; privacySetupCompleted: boolean; onboardingVersion?: number; ageBand: 'unknown' | 'under_18' | 'adult'; matureProfileEnabled: boolean; showAgeRestrictedLists?: boolean; birthdaySetupCompleted?: boolean; hasAvatar: boolean; isPro?: boolean }
export interface SocialUser { id: string; username: string; displayName?: string; hasAvatar: boolean }
export interface Friendship { id: string; user: SocialUser; direction: 'incoming' | 'outgoing'; status: 'pending' | 'accepted' }
export interface FriendGroup { id: string; name: string; members: SocialUser[] }
export interface RecurringOccasion { id?: string; name: string; eventMonth: number; eventDay: number; reminderMonth: number; reminderDay: number; icon: string; colorHex: string; lastCreatedYear?: number }
export interface WishlistAudience { userIDs: string[]; groupIDs: string[] }
export interface ActivityItem { id: string; kind: string; title: string; message: string; actorID?: string; wishlistID?: string; readAt?: string; createdAt?: string }
export interface ActivityUnreadCount { count: number }
export interface Wishlist {
  id: string; title: string; visibility: 'private' | 'public'; collaborationMode?: 'our_wishlist' | 'gift_planning';
  isPrimaryOwner?: boolean; isCollaborative?: boolean; occasionDate?: string; reminderEnabled?: boolean;
  icon?: string; colorTheme?: string; isArchived?: boolean; description?: string; customColorHex?: string; reminderDate?: string;
  matureContentEnabled?: boolean
  proAccess?: boolean
}
export interface WishlistCollaborator { id: string; displayName?: string; username?: string; isPrimaryOwner: boolean }
export interface WishlistCollaboration { mode: 'our_wishlist' | 'gift_planning'; collaborators: WishlistCollaborator[] }
export interface WishlistSettings {
  visibility: 'private' | 'public'; showPurchaserNames: boolean; allowMultiplePurchases: boolean;
  allowNotes: boolean; autoLockOnPurchase: boolean; occasionDate?: string; reminderEnabled?: boolean;
  icon?: string; colorTheme?: string; isArchived?: boolean; description?: string; customColorHex?: string; reminderDate?: string;
  matureContentEnabled?: boolean
}
export interface ProfileWishlist { wishlistID: string; title: string; accountShareID?: string }
export interface ProfileAttribute { id?: string; label: string; value: string; visibility: 'public' | 'friends' | 'private' }
export interface ProfileDetails { matureProfileEnabled?: boolean; birthdayYear?: number; birthdayMonth?: number; birthdayDay?: number; birthdayVisibility: 'public' | 'friends' | 'private'; birthdaySetupCompleted: boolean; attributes: ProfileAttribute[] }
export interface BirthdayAlert { enabled: boolean; reminderDaysBefore: number }
export interface FriendProfile { user: SocialUser; publicWishlists: ProfileWishlist[]; sharedWishlists: ProfileWishlist[]; birthdayMonth?: number; birthdayDay?: number; attributes?: ProfileAttribute[]; birthdayAlertEnabled?: boolean; birthdayAlertDaysBefore?: number }
export interface Pins { wishlistIDs: string[]; userIDs: string[]; groupIDs: string[] }
export interface WishlistItem {
  id: string; title: string; url?: string; price?: number; ownerNote?: string; quantity?: number;
  itemType?: 'wish' | 'cash_fund'; contributionGoal?: number;
  createdAt: string; updatedAt: string; wishlist: { id: string }
}
export interface SharedWishlist { shareToken: string; title: string; sharedByName?: string; accountShareID?: string; wishlistID?: string; matureContentEnabled?: boolean }
export interface GuestShareLink { id: string; createdAt?: string; expiresAt?: string }
export interface AccountSharedWishlist { id: string; wishlistID: string; title: string; sharedByName: string; matureContentEnabled?: boolean }
export interface SharedNote { stateID?: string; authorDisplayName?: string; updatedAt?: string; note: string; isMine?: boolean }
export interface WishlistDiscussionComment { id: string; message: string; authorDisplayName?: string; createdAt?: string; isMine: boolean }
export interface UserFeedback { id: string; category: string; message: string; platform: string; userID: string; userEmail?: string; userDisplayName?: string; createdAt?: string }
export interface AdminAccount { id: string; displayName?: string; email: string; username?: string; emailVerified?: boolean; onboardingVersion?: number; isPro?: boolean; suspicious?: boolean; createdAt?: string }
export interface AdminProGrant { id: string; userID: string; userEmail: string; userDisplayName?: string; reason: string; active: boolean; grantedAt?: string; revokedAt?: string; grantedByEmail?: string }
export interface UserReport { id: string; reporterID?: string; reporterEmail?: string; reportedID: string; reportedEmail: string; reason: string; details: string; targetType?: string; targetID?: string; status: string; resolvedAt?: string; createdAt?: string }
export interface SharedItemRow {
  purchasedByMe: boolean; purchased: boolean; purchasedByOthers?: boolean; purchasedQuantity?: number; purchasedQuantityByMe?: number; purchasedByNames?: string[]; notes: SharedNote[];
  item: WishlistItem
}
export interface ShareViewResponse {
  viewerToken: string
  wishlist: { id: string; title: string; sharedByName: string }
  requiresAdultConfirmation?: boolean
}
