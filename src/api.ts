import type { AccountSharedWishlist, ActivityItem, ActivityUnreadCount, AdminAccount, AdminProGrant, BirthdayAlert, CurrentUser, EmailVerificationPendingResponse, FeedbackThread, FriendGroup, FriendProfile, Friendship, GuestShareLink, Pins, ProfileAttribute, ProfileDetails, RecurringOccasion, ShareViewResponse, SharedItemRow, SocialUser, TokenResponse, UserFeedback, UserReport, Wishlist, WishlistAudience, WishlistCollaboration, WishlistDiscussionComment, WishlistItem, WishlistSettings } from './types'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
export const CURRENT_TERMS_VERSION = '2026-09-10'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const canRetry = method === 'GET' || method === 'HEAD'
  let response: Response | undefined
  let lastError: unknown
  for (let attempt = 0; attempt < (canRetry ? 3 : 1); attempt += 1) {
    try {
      response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
      })
      if (!canRetry || response.status < 500 || attempt === 2) break
    } catch (error) {
      lastError = error
      if (attempt === 2 || !canRetry) throw error
    }
    await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)))
  }
  if (!response) throw (lastError instanceof Error ? lastError : new Error('Unable to connect to Hushful.'))
  if (!response.ok) {
    const body = await response.text()
    let message = body || `Request failed (${response.status})`
    try { message = JSON.parse(body).reason ?? message } catch { /* response was plain text */ }
    throw new ApiError(response.status, message)
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T
  return response.json() as Promise<T>
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
const viewer = (token: string) => ({ 'X-Viewer-Token': token })

async function avatarRequest(token: string, method: 'PUT' | 'DELETE', file?: File): Promise<CurrentUser> {
  const response = await fetch(`${API_URL}/v1/me/avatar`, { method, headers: { ...auth(token), ...(file ? { 'Content-Type': file.type } : {}) }, body: file })
  if (!response.ok) { const body = await response.text(); let message = body || `Request failed (${response.status})`; try { message = JSON.parse(body).reason ?? message } catch { /* plain response */ }; throw new ApiError(response.status, message) }
  return response.json() as Promise<CurrentUser>
}

async function itemImageRequest(token: string, wishlistId: string, itemId: string, method: 'PUT' | 'DELETE', file?: File): Promise<void> {
  const response = await fetch(`${API_URL}/v1/wishlists/${wishlistId}/items/${itemId}/image`, { method, headers: { ...auth(token), ...(file ? { 'Content-Type': file.type } : {}) }, body: file })
  if (!response.ok) { const body = await response.text(); let message = body || `Request failed (${response.status})`; try { message = JSON.parse(body).reason ?? message } catch { /* plain response */ }; throw new ApiError(response.status, message) }
}

async function protectedImage(path: string, accessToken?: string, viewerToken?: string): Promise<Blob> {
  const response = await fetch(`${API_URL}${path}`, { headers: { ...(accessToken ? auth(accessToken) : {}), ...(viewerToken ? viewer(viewerToken) : {}) } })
  if (!response.ok) throw new ApiError(response.status, 'Image unavailable')
  return response.blob()
}

export const api = {
  register: (email: string, password: string, displayName: string, acceptedTermsVersion = CURRENT_TERMS_VERSION, ageConfirmed = false) => request<EmailVerificationPendingResponse>('/v1/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName, website: '', acceptedTermsVersion, ageConfirmed }) }),
  login: (email: string, password: string, totpCode?: string) => request<TokenResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password, ...(totpCode ? { totpCode } : {}) }) }),
  googleLogin: (idToken: string, acceptedTermsVersion?: string, totpCode?: string, ageConfirmed = false) => request<TokenResponse>('/v1/auth/google', { method: 'POST', body: JSON.stringify({ idToken, ...(acceptedTermsVersion ? { acceptedTermsVersion, ageConfirmed } : {}), ...(totpCode ? { totpCode } : {}) }) }),
  verifyEmail: (token: string) => request<TokenResponse>('/v1/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  resendEmailVerification: (email: string) => request<{ message: string }>('/v1/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email: string) => request<{ message: string }>('/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => request<{ message: string }>('/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  me: (token: string) => request<CurrentUser>('/v1/me', { headers: auth(token) }),
  profileDetails: (token: string) => request<ProfileDetails>('/v1/me/profile-details', { headers: auth(token) }),
  updateProfileDetails: (token: string, body: { matureProfileEnabled?: boolean; birthdayYear?: number; birthdayMonth?: number; birthdayDay?: number; birthdayVisibility?: ProfileDetails['birthdayVisibility']; clearBirthday?: boolean; birthdaySetupCompleted?: boolean }) => request<ProfileDetails>('/v1/me/profile-details', { method: 'PATCH', headers: auth(token), body: JSON.stringify(body) }),
  createProfileAttribute: (token: string, body: Omit<ProfileAttribute, 'id'>) => request<ProfileAttribute>('/v1/me/profile-attributes', { method: 'POST', headers: auth(token), body: JSON.stringify(body) }),
  updateProfileAttribute: (token: string, id: string, body: Omit<ProfileAttribute, 'id'>) => request<ProfileAttribute>(`/v1/me/profile-attributes/${id}`, { method: 'PUT', headers: auth(token), body: JSON.stringify(body) }),
  deleteProfileAttribute: (token: string, id: string) => request<void>(`/v1/me/profile-attributes/${id}`, { method: 'DELETE', headers: auth(token) }),
  updateProfile: (token: string, profile: Partial<Pick<CurrentUser, 'displayName' | 'username' | 'isDiscoverable' | 'friendRequestPolicy' | 'privacySetupCompleted' | 'onboardingVersion' | 'showAgeRestrictedLists'>>) => request<CurrentUser>('/v1/me', { method: 'PATCH', headers: auth(token), body: JSON.stringify(profile) }),
  deleteAccount: (token: string) => request<void>('/v1/me', { method: 'DELETE', headers: auth(token) }),
  avatarURL: (userId: string) => `${API_URL}/v1/users/${userId}/avatar`,
  itemImageURL: (itemId: string, version?: string) => `${API_URL}/v1/items/${itemId}/image${version ? `?v=${encodeURIComponent(version)}` : ''}`,
  protectedImage,
  uploadAvatar: (token: string, file: File) => avatarRequest(token, 'PUT', file),
  removeAvatar: (token: string) => avatarRequest(token, 'DELETE'),
  uploadItemImage: (token: string, wishlistId: string, itemId: string, file: File) => itemImageRequest(token, wishlistId, itemId, 'PUT', file),
  removeItemImage: (token: string, wishlistId: string, itemId: string) => itemImageRequest(token, wishlistId, itemId, 'DELETE'),
  trackPageView: (visitorID: string, path: string, signedIn: boolean) => request<void>('/v1/metrics/events', { method: 'POST', body: JSON.stringify({ visitorID, path, signedIn }) }),
  metricsSummary: (token: string, days = 30) => request<{ days: number; views: number; visitors: number; signedInViews: number; totalAccounts: number; newAccounts: number; daily: Array<{ date: string; views: number; visitors: number; signups: number }>; topPaths: Array<{ path: string; views: number }> }>(`/v1/metrics/summary?days=${days}`, { headers: auth(token) }),
  submitFeedback: (token: string, category: string, message: string) => request<UserFeedback>('/v1/feedback', { method: 'POST', headers: auth(token), body: JSON.stringify({ category, message, platform: 'web', shareName: category === 'purchase' }) }),
  feedback: (token: string) => request<UserFeedback[]>('/v1/feedback', { headers: auth(token) }),
  feedbackThread: (token: string, id: string) => request<FeedbackThread>(`/v1/feedback/${id}`, { headers: auth(token) }),
  replyToFeedback: (token: string, id: string, message: string) => request<FeedbackThread>(`/v1/feedback/${id}/replies`, { method: 'POST', headers: auth(token), body: JSON.stringify({ message }) }),
  adminFeedback: (token: string, includeArchived = false) => request<UserFeedback[]>(`/v1/admin/feedback${includeArchived ? '?includeArchived=true' : ''}`, { headers: auth(token) }),
  adminFeedbackThread: (token: string, id: string) => request<FeedbackThread>(`/v1/admin/feedback/${id}`, { headers: auth(token) }),
  adminReplyToFeedback: (token: string, id: string, message: string) => request<FeedbackThread>(`/v1/admin/feedback/${id}/replies`, { method: 'POST', headers: auth(token), body: JSON.stringify({ message }) }),
  closeFeedback: (token: string, id: string) => request<UserFeedback>(`/v1/admin/feedback/${id}/close`, { method: 'POST', headers: auth(token) }),
  reopenFeedback: (token: string, id: string) => request<UserFeedback>(`/v1/admin/feedback/${id}/reopen`, { method: 'POST', headers: auth(token) }),
  archiveFeedback: (token: string, id: string) => request<UserFeedback>(`/v1/admin/feedback/${id}/archive`, { method: 'POST', headers: auth(token) }),
  unarchiveFeedback: (token: string, id: string) => request<UserFeedback>(`/v1/admin/feedback/${id}/unarchive`, { method: 'POST', headers: auth(token) }),
  adminAccounts: (token: string, query = '') => request<AdminAccount[]>('/v1/metrics/accounts?limit=1000' + (query ? '&q=' + encodeURIComponent(query) : ''), { headers: auth(token) }),
  adminProGrants: (token: string) => request<AdminProGrant[]>('/v1/admin/pro/grants', { headers: auth(token) }),
  grantProAccess: (token: string, userID: string, reason: string) => request<AdminProGrant>('/v1/admin/pro/grants', { method: 'POST', headers: auth(token), body: JSON.stringify({ userID, reason }) }),
  revokeProAccess: (token: string, grantID: string) => request<AdminProGrant>(`/v1/admin/pro/grants/${grantID}/revoke`, { method: 'POST', headers: auth(token) }),
  adminReports: (token: string) => request<UserReport[]>('/v1/admin/reports', { headers: auth(token) }),
  adminAudit: (token: string) => request<Array<{ id: string; adminEmail?: string; action: string; targetType?: string; targetID?: string; metadata?: string; createdAt?: string }>>('/v1/admin/audit', { headers: auth(token) }),
  adminTOTPStatus: (token: string) => request<{ enabled: boolean; recoveryCodesRemaining: number }>('/v1/admin/security/totp/status', { headers: auth(token) }),
  enrollAdminTOTP: (token: string) => request<{ secret: string; provisioningURI: string; recoveryCodes: string[] }>('/v1/admin/security/totp/enroll', { method: 'POST', headers: auth(token) }),
  confirmAdminTOTP: (token: string, code: string) => request<{ enabled: boolean; recoveryCodesRemaining: number }>('/v1/admin/security/totp/confirm', { method: 'POST', headers: auth(token), body: JSON.stringify({ code }) }),
  disableAdminTOTP: (token: string) => request<{ enabled: boolean; recoveryCodesRemaining: number }>('/v1/admin/security/totp/disable', { method: 'POST', headers: auth(token) }),
  removeReportedContent: (token: string, reportID: string) => request<void>(`/v1/admin/reports/${reportID}/remove-content`, { method: 'POST', headers: auth(token) }),
  dismissReport: (token: string, reportID: string) => request<void>(`/v1/admin/reports/${reportID}/dismiss`, { method: 'POST', headers: auth(token) }),
  suspendReportedUser: (token: string, reportID: string) => request<void>(`/v1/admin/reports/${reportID}/suspend-reported-user`, { method: 'POST', headers: auth(token) }),
  activity: (token: string) => request<ActivityItem[]>('/v1/activity', { headers: auth(token) }),
  unreadActivityCount: (token: string) => request<ActivityUnreadCount>('/v1/activity/unread-count', { headers: auth(token) }),
  readActivity: (token: string, id: string) => request<ActivityItem>(`/v1/activity/${id}/read`, { method: 'POST', headers: auth(token) }),
  readAllActivity: (token: string) => request<void>('/v1/activity/read-all', { method: 'POST', headers: auth(token) }),
  deleteActivity: (token: string, id: string) => request<void>(`/v1/activity/${id}`, { method: 'DELETE', headers: auth(token) }),
  clearActivity: (token: string) => request<void>('/v1/activity', { method: 'DELETE', headers: auth(token) }),
  occasions: (token: string) => request<RecurringOccasion[]>('/v1/recurring-occasions', { headers: auth(token) }),
  createOccasion: (token: string, value: RecurringOccasion) => request<RecurringOccasion>('/v1/recurring-occasions', { method: 'POST', headers: auth(token), body: JSON.stringify(value) }),
  updateOccasion: (token: string, value: RecurringOccasion) => request<RecurringOccasion>(`/v1/recurring-occasions/${value.id}`, { method: 'PUT', headers: auth(token), body: JSON.stringify(value) }),
  deleteOccasion: (token: string, id: string) => request<void>(`/v1/recurring-occasions/${id}`, { method: 'DELETE', headers: auth(token) }),
  pins: (token: string) => request<Pins>('/v1/pins', { headers: auth(token) }),
  pin: (token: string, type: 'wishlist' | 'user' | 'group', id: string) => request<Pins>(`/v1/pins/${type}/${id}`, { method: 'PUT', headers: auth(token) }),
  unpin: (token: string, type: 'wishlist' | 'user' | 'group', id: string) => request<Pins>(`/v1/pins/${type}/${id}`, { method: 'DELETE', headers: auth(token) }),
  searchUsers: (token: string, q: string) => request<SocialUser[]>(`/v1/users/search?q=${encodeURIComponent(q)}`, { headers: auth(token) }),
  friends: (token: string) => request<Friendship[]>('/v1/friends', { headers: auth(token) }),
  friendProfile: (token: string, userId: string) => request<FriendProfile>(`/v1/users/${userId}/profile`, { headers: auth(token) }),
  birthdayAlert: (token: string, userId: string) => request<BirthdayAlert>(`/v1/users/${userId}/birthday-alert`, { headers: auth(token) }),
  updateBirthdayAlert: (token: string, userId: string, enabled: boolean, reminderDaysBefore = 7) => request<BirthdayAlert>(`/v1/users/${userId}/birthday-alert`, { method: 'PUT', headers: auth(token), body: JSON.stringify({ enabled, reminderDaysBefore }) }),
  openPublicWishlist: (token: string, wishlistId: string) => request<AccountSharedWishlist>(`/v1/public-wishlists/${wishlistId}/open`, { method: 'POST', headers: auth(token) }),
  friendRequests: (token: string) => request<Friendship[]>('/v1/friend-requests', { headers: auth(token) }),
  requestFriend: (token: string, userId: string) => request<Friendship>(`/v1/friend-requests/${userId}`, { method: 'POST', headers: auth(token) }),
  acceptFriend: (token: string, friendshipId: string) => request<Friendship>(`/v1/friend-requests/${friendshipId}/accept`, { method: 'POST', headers: auth(token) }),
  acceptFriendFrom: (token: string, userId: string) => request<Friendship>(`/v1/friend-requests/from/${userId}/accept`, { method: 'POST', headers: auth(token) }),
  declineFriendFrom: (token: string, userId: string) => request<void>(`/v1/friend-requests/from/${userId}`, { method: 'DELETE', headers: auth(token) }),
  removeFriendship: (token: string, friendshipId: string) => request<void>(`/v1/friendships/${friendshipId}`, { method: 'DELETE', headers: auth(token) }),
  blockUser: (token: string, userId: string) => request<void>(`/v1/blocks/${userId}`, { method: 'PUT', headers: auth(token) }),
  reportUser: (token: string, userId: string, reason: string, details: string) => request<void>(`/v1/reports/users/${userId}`, { method: 'POST', headers: auth(token), body: JSON.stringify({ reason, details }) }),
  reportSharedWishlist: (token: string, accountShareID: string | undefined, shareToken: string, reason: string, details: string) => request<void>(accountShareID ? `/v1/reports/shared-wishlists/${accountShareID}` : `/v1/reports/share-links/${shareToken}`, { method: 'POST', headers: auth(token), body: JSON.stringify({ reason, details }) }),
  reportDiscussionComment: (token: string, commentID: string, reason = 'other', details = '') => request<void>(`/v1/reports/discussion-comments/${commentID}`, { method: 'POST', headers: auth(token), body: JSON.stringify({ reason, details }) }),
  reportItemNote: (token: string, stateID: string, reason = 'other', details = '') => request<void>(`/v1/reports/item-notes/${stateID}`, { method: 'POST', headers: auth(token), body: JSON.stringify({ reason, details }) }),
  reportGuestShareLink: (shareToken: string, viewerToken: string, reason = 'other', details = '') => request<void>(`/v1/public-reports/share-links/${encodeURIComponent(shareToken)}`, { method: 'POST', headers: viewer(viewerToken), body: JSON.stringify({ reason, details }) }),
  guestShareLinks: (token: string, wishlistId: string) => request<GuestShareLink[]>(`/v1/wishlists/${wishlistId}/shares`, { headers: auth(token) }),
  revokeGuestShareLink: (token: string, wishlistId: string, shareId: string) => request<void>(`/v1/wishlists/${wishlistId}/shares/${shareId}`, { method: 'DELETE', headers: auth(token) }),
  rotateGuestShareLink: (token: string, wishlistId: string, shareId: string) => request<{ shareToken: string }>(`/v1/wishlists/${wishlistId}/shares/${shareId}/rotate`, { method: 'POST', headers: auth(token) }),
  friendGroups: (token: string) => request<FriendGroup[]>('/v1/friend-groups', { headers: auth(token) }),
  createFriendGroup: (token: string, name: string) => request<FriendGroup>('/v1/friend-groups', { method: 'POST', headers: auth(token), body: JSON.stringify({ name }) }),
  addGroupMember: (token: string, groupId: string, userId: string) => request<FriendGroup>(`/v1/friend-groups/${groupId}/members/${userId}`, { method: 'PUT', headers: auth(token) }),
  removeGroupMember: (token: string, groupId: string, userId: string) => request<FriendGroup>(`/v1/friend-groups/${groupId}/members/${userId}`, { method: 'DELETE', headers: auth(token) }),
  wishlistAudience: (token: string, wishlistId: string) => request<WishlistAudience>(`/v1/wishlists/${wishlistId}/audience`, { headers: auth(token) }),
  updateWishlistAudience: (token: string, wishlistId: string, audience: WishlistAudience) => request<WishlistAudience>(`/v1/wishlists/${wishlistId}/audience`, { method: 'PUT', headers: auth(token), body: JSON.stringify(audience) }),
  wishlistCollaboration: (token: string, wishlistId: string) => request<WishlistCollaboration>(`/v1/wishlists/${wishlistId}/collaborators`, { headers: auth(token) }),
  updateWishlistCollaboration: (token: string, wishlistId: string, mode: 'our_wishlist' | 'gift_planning', userIDs: string[]) => request<WishlistCollaboration>(`/v1/wishlists/${wishlistId}/collaborators`, { method: 'PUT', headers: auth(token), body: JSON.stringify({ mode, userIDs }) }),
  wishlistDiscussion: (token: string, wishlistId: string) => request<WishlistDiscussionComment[]>(`/v1/wishlists/${wishlistId}/discussion`, { headers: auth(token) }),
  wishlistDiscussionMentionCandidates: (token: string, wishlistId: string) => request<SocialUser[]>(`/v1/wishlists/${wishlistId}/discussion/mention-candidates`, { headers: auth(token) }),
  createWishlistDiscussionComment: (token: string, wishlistId: string, body: { message: string; displayName?: string; shareName: boolean }) => request<WishlistDiscussionComment>(`/v1/wishlists/${wishlistId}/discussion`, { method: 'POST', headers: auth(token), body: JSON.stringify(body) }),
  deleteWishlistDiscussionComment: (token: string, wishlistId: string, commentId: string) => request<void>(`/v1/wishlists/${wishlistId}/discussion/${commentId}`, { method: 'DELETE', headers: auth(token) }),
  giftPlanningItems: (token: string, wishlistId: string) => request<SharedItemRow[]>(`/v1/wishlists/${wishlistId}/planning-items`, { headers: auth(token) }),
  deleteWishlist: (token: string, id: string) => request<void>(`/v1/wishlists/${id}`, { method: 'DELETE', headers: auth(token) }),
  wishlists: (token: string) => request<Wishlist[]>('/v1/wishlists', { headers: auth(token) }),
  wishlistSettings: (token: string, wishlistId: string) => request<WishlistSettings>(`/v1/wishlists/${wishlistId}/settings`, { headers: auth(token) }),
  updateWishlistSettings: (token: string, wishlistId: string, settings: Partial<WishlistSettings>) => request<WishlistSettings>(`/v1/wishlists/${wishlistId}/settings`, { method: 'PATCH', headers: auth(token), body: JSON.stringify(settings) }),
  wishlistMentionCandidates: (token: string, wishlistId: string) => request<SocialUser[]>(`/v1/wishlists/${wishlistId}/mention-candidates`, { headers: auth(token) }),
  createWishlist: (token: string, title: string, visibility: 'public' | 'private') => request<Wishlist>('/v1/wishlists', { method: 'POST', headers: auth(token), body: JSON.stringify({ title, visibility }) }),
  renameWishlist: (token: string, id: string, title: string) => request<Wishlist>(`/v1/wishlists/${id}`, { method: 'PATCH', headers: auth(token), body: JSON.stringify({ title }) }),
  items: (token: string, id: string) => request<WishlistItem[]>(`/v1/wishlists/${id}/items`, { headers: auth(token) }),
  createItem: (token: string, id: string, item: { title: string; url?: string; price?: number; ownerNote?: string; quantity: number; linkedWishlistIDs?: string[]; itemType?: 'wish' | 'cash_fund'; contributionGoal?: number }) => request<WishlistItem>(`/v1/wishlists/${id}/items`, { method: 'POST', headers: auth(token), body: JSON.stringify(item) }),
  itemLinks: (token: string, wishlistId: string, itemId: string) => request<{ wishlistIDs: string[] }>(`/v1/wishlists/${wishlistId}/items/${itemId}/links`, { headers: auth(token) }),
  async updateItem(token: string, wishlistId: string, itemId: string, item: { title: string; url?: string; price?: number; ownerNote?: string; quantity: number; linkedWishlistIDs?: string[]; itemType?: 'wish' | 'cash_fund'; contributionGoal?: number }) {
    const path = `/v1/wishlists/${wishlistId}/items/${itemId}`
    const options = { headers: auth(token), body: JSON.stringify(item) }
    try {
      return await request<WishlistItem>(path, { ...options, method: 'PUT' })
    } catch (error) {
      // The currently deployed API predates PUT item replacement but supports PATCH.
      if (!(error instanceof ApiError) || ![404, 405].includes(error.status)) throw error
      return request<WishlistItem>(path, { ...options, method: 'PATCH' })
    }
  },
  deleteItem: (token: string, wishlistId: string, itemId: string) => request<void>(`/v1/wishlists/${wishlistId}/items/${itemId}`, { method: 'DELETE', headers: auth(token) }),
  createShare: (token: string, id: string) => request<{ shareToken: string; expiresAt?: string }>(`/v1/wishlists/${id}/shares`, { method: 'POST', headers: auth(token) }),
  openShare: (shareToken: string, viewerToken?: string, accessToken?: string) => request<ShareViewResponse>(`/v1/shares/${shareToken}`, { headers: { ...(viewerToken ? viewer(viewerToken) : {}), ...(accessToken ? auth(accessToken) : {}) } }),
  accountShares: (token: string) => request<AccountSharedWishlist[]>('/v1/shared-wishlists', { headers: auth(token) }),
  saveAccountShare: (token: string, shareToken: string, viewerToken?: string) => request<AccountSharedWishlist>(`/v1/shared-wishlists/open/${shareToken}`, { method: 'POST', headers: { ...auth(token), ...(viewerToken ? viewer(viewerToken) : {}) } }),
  removeAccountShare: (token: string, id: string) => request<void>(`/v1/shared-wishlists/${id}`, { method: 'DELETE', headers: auth(token) }),
  accountSharedItems: (token: string, id: string) => request<SharedItemRow[]>(`/v1/shared-wishlists/${id}/items`, { headers: auth(token) }),
  updateAccountSharedItem: (token: string, shareId: string, itemId: string, body: { purchased?: boolean; purchasedQuantity?: number; note?: string; displayName?: string; shareName?: boolean }) => request<SharedItemRow>(`/v1/shared-wishlists/${shareId}/items/${itemId}/state`, { method: 'PUT', headers: auth(token), body: JSON.stringify(body) }),
  accountMentionCandidates: (token: string, shareId: string) => request<SocialUser[]>(`/v1/shared-wishlists/${shareId}/mention-candidates`, { headers: auth(token) }),
  accountDiscussion: (token: string, shareId: string) => request<WishlistDiscussionComment[]>(`/v1/shared-wishlists/${shareId}/discussion`, { headers: auth(token) }),
  createAccountDiscussionComment: (token: string, shareId: string, body: { message: string; displayName?: string; shareName: boolean }) => request<WishlistDiscussionComment>(`/v1/shared-wishlists/${shareId}/discussion`, { method: 'POST', headers: auth(token), body: JSON.stringify(body) }),
  deleteAccountDiscussionComment: (token: string, shareId: string, commentId: string) => request<void>(`/v1/shared-wishlists/${shareId}/discussion/${commentId}`, { method: 'DELETE', headers: auth(token) }),
  sharedItems: (shareToken: string, viewerToken: string) => request<SharedItemRow[]>(`/v1/shares/${shareToken}/items`, { headers: viewer(viewerToken) }),
  confirmAdultShare: (shareToken: string, viewerToken: string, accessToken?: string) => request<ShareViewResponse>(`/v1/shares/${shareToken}/confirm-adult`, { method: 'POST', headers: { ...viewer(viewerToken), ...(accessToken ? auth(accessToken) : {}) }, body: JSON.stringify({ confirmedAdult: true }) }),
  updateSharedItem: (shareToken: string, itemId: string, viewerToken: string, body: { purchased?: boolean; purchasedQuantity?: number; note?: string; displayName?: string; shareName?: boolean }) => request<SharedItemRow>(`/v1/shares/${shareToken}/items/${itemId}/state`, { method: 'PUT', headers: viewer(viewerToken), body: JSON.stringify(body) }),
  mentionCandidates: (shareToken: string, viewerToken: string) => request<SocialUser[]>(`/v1/shares/${shareToken}/mention-candidates`, { headers: viewer(viewerToken) }),
  discussion: (shareToken: string, viewerToken: string) => request<WishlistDiscussionComment[]>(`/v1/shares/${shareToken}/discussion`, { headers: viewer(viewerToken) }),
  createDiscussionComment: (shareToken: string, viewerToken: string, body: { message: string; displayName?: string; shareName: boolean }) => request<WishlistDiscussionComment>(`/v1/shares/${shareToken}/discussion`, { method: 'POST', headers: viewer(viewerToken), body: JSON.stringify(body) }),
  deleteDiscussionComment: (shareToken: string, viewerToken: string, commentId: string) => request<void>(`/v1/shares/${shareToken}/discussion/${commentId}`, { method: 'DELETE', headers: viewer(viewerToken) }),
}
