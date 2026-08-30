import type { AccountSharedWishlist, ActivityItem, CurrentUser, FriendGroup, FriendProfile, Friendship, Pins, ShareViewResponse, SharedItemRow, SocialUser, TokenResponse, Wishlist, WishlistAudience, WishlistItem, WishlistSettings } from './types'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  })
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

export const api = {
  register: (email: string, password: string, displayName: string) => request<TokenResponse>('/v1/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) }),
  login: (email: string, password: string) => request<TokenResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  googleLogin: (idToken: string) => request<TokenResponse>('/v1/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
  forgotPassword: (email: string) => request<{ message: string }>('/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => request<{ message: string }>('/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  me: (token: string) => request<CurrentUser>('/v1/me', { headers: auth(token) }),
  updateProfile: (token: string, profile: Partial<Pick<CurrentUser, 'displayName' | 'username' | 'isDiscoverable' | 'friendRequestPolicy'>>) => request<CurrentUser>('/v1/me', { method: 'PATCH', headers: auth(token), body: JSON.stringify(profile) }),
  avatarURL: (userId: string) => `${API_URL}/v1/users/${userId}/avatar`,
  uploadAvatar: (token: string, file: File) => avatarRequest(token, 'PUT', file),
  removeAvatar: (token: string) => avatarRequest(token, 'DELETE'),
  activity: (token: string) => request<ActivityItem[]>('/v1/activity', { headers: auth(token) }),
  readActivity: (token: string, id: string) => request<ActivityItem>(`/v1/activity/${id}/read`, { method: 'POST', headers: auth(token) }),
  readAllActivity: (token: string) => request<void>('/v1/activity/read-all', { method: 'POST', headers: auth(token) }),
  deleteActivity: (token: string, id: string) => request<void>(`/v1/activity/${id}`, { method: 'DELETE', headers: auth(token) }),
  clearActivity: (token: string) => request<void>('/v1/activity', { method: 'DELETE', headers: auth(token) }),
  pins: (token: string) => request<Pins>('/v1/pins', { headers: auth(token) }),
  pin: (token: string, type: 'wishlist' | 'user' | 'group', id: string) => request<Pins>(`/v1/pins/${type}/${id}`, { method: 'PUT', headers: auth(token) }),
  unpin: (token: string, type: 'wishlist' | 'user' | 'group', id: string) => request<Pins>(`/v1/pins/${type}/${id}`, { method: 'DELETE', headers: auth(token) }),
  searchUsers: (token: string, q: string) => request<SocialUser[]>(`/v1/users/search?q=${encodeURIComponent(q)}`, { headers: auth(token) }),
  friends: (token: string) => request<Friendship[]>('/v1/friends', { headers: auth(token) }),
  friendProfile: (token: string, userId: string) => request<FriendProfile>(`/v1/users/${userId}/profile`, { headers: auth(token) }),
  openPublicWishlist: (token: string, wishlistId: string) => request<AccountSharedWishlist>(`/v1/public-wishlists/${wishlistId}/open`, { method: 'POST', headers: auth(token) }),
  friendRequests: (token: string) => request<Friendship[]>('/v1/friend-requests', { headers: auth(token) }),
  requestFriend: (token: string, userId: string) => request<Friendship>(`/v1/friend-requests/${userId}`, { method: 'POST', headers: auth(token) }),
  acceptFriend: (token: string, friendshipId: string) => request<Friendship>(`/v1/friend-requests/${friendshipId}/accept`, { method: 'POST', headers: auth(token) }),
  acceptFriendFrom: (token: string, userId: string) => request<Friendship>(`/v1/friend-requests/from/${userId}/accept`, { method: 'POST', headers: auth(token) }),
  declineFriendFrom: (token: string, userId: string) => request<void>(`/v1/friend-requests/from/${userId}`, { method: 'DELETE', headers: auth(token) }),
  removeFriendship: (token: string, friendshipId: string) => request<void>(`/v1/friendships/${friendshipId}`, { method: 'DELETE', headers: auth(token) }),
  friendGroups: (token: string) => request<FriendGroup[]>('/v1/friend-groups', { headers: auth(token) }),
  createFriendGroup: (token: string, name: string) => request<FriendGroup>('/v1/friend-groups', { method: 'POST', headers: auth(token), body: JSON.stringify({ name }) }),
  addGroupMember: (token: string, groupId: string, userId: string) => request<FriendGroup>(`/v1/friend-groups/${groupId}/members/${userId}`, { method: 'PUT', headers: auth(token) }),
  removeGroupMember: (token: string, groupId: string, userId: string) => request<FriendGroup>(`/v1/friend-groups/${groupId}/members/${userId}`, { method: 'DELETE', headers: auth(token) }),
  wishlistAudience: (token: string, wishlistId: string) => request<WishlistAudience>(`/v1/wishlists/${wishlistId}/audience`, { headers: auth(token) }),
  updateWishlistAudience: (token: string, wishlistId: string, audience: WishlistAudience) => request<WishlistAudience>(`/v1/wishlists/${wishlistId}/audience`, { method: 'PUT', headers: auth(token), body: JSON.stringify(audience) }),
  wishlists: (token: string) => request<Wishlist[]>('/v1/wishlists', { headers: auth(token) }),
  wishlistSettings: (token: string, wishlistId: string) => request<WishlistSettings>(`/v1/wishlists/${wishlistId}/settings`, { headers: auth(token) }),
  updateWishlistSettings: (token: string, wishlistId: string, settings: Partial<WishlistSettings>) => request<WishlistSettings>(`/v1/wishlists/${wishlistId}/settings`, { method: 'PATCH', headers: auth(token), body: JSON.stringify(settings) }),
  createWishlist: (token: string, title: string) => request<Wishlist>('/v1/wishlists', { method: 'POST', headers: auth(token), body: JSON.stringify({ title }) }),
  items: (token: string, id: string) => request<WishlistItem[]>(`/v1/wishlists/${id}/items`, { headers: auth(token) }),
  createItem: (token: string, id: string, item: { title: string; url?: string; price?: number; ownerNote?: string; quantity: number }) => request<WishlistItem>(`/v1/wishlists/${id}/items`, { method: 'POST', headers: auth(token), body: JSON.stringify(item) }),
  async updateItem(token: string, wishlistId: string, itemId: string, item: { title: string; url?: string; price?: number; ownerNote?: string; quantity: number }) {
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
  createShare: (token: string, id: string) => request<{ shareToken: string }>(`/v1/wishlists/${id}/shares`, { method: 'POST', headers: auth(token) }),
  openShare: (shareToken: string, viewerToken?: string) => request<ShareViewResponse>(`/v1/shares/${shareToken}`, { headers: viewerToken ? viewer(viewerToken) : {} }),
  accountShares: (token: string) => request<AccountSharedWishlist[]>('/v1/shared-wishlists', { headers: auth(token) }),
  saveAccountShare: (token: string, shareToken: string, viewerToken?: string) => request<AccountSharedWishlist>(`/v1/shared-wishlists/open/${shareToken}`, { method: 'POST', headers: { ...auth(token), ...(viewerToken ? viewer(viewerToken) : {}) } }),
  removeAccountShare: (token: string, id: string) => request<void>(`/v1/shared-wishlists/${id}`, { method: 'DELETE', headers: auth(token) }),
  accountSharedItems: (token: string, id: string) => request<SharedItemRow[]>(`/v1/shared-wishlists/${id}/items`, { headers: auth(token) }),
  updateAccountSharedItem: (token: string, shareId: string, itemId: string, body: { purchased?: boolean; purchasedQuantity?: number; note?: string; displayName?: string; shareName?: boolean }) => request<SharedItemRow>(`/v1/shared-wishlists/${shareId}/items/${itemId}/state`, { method: 'PUT', headers: auth(token), body: JSON.stringify(body) }),
  sharedItems: (shareToken: string, viewerToken: string) => request<SharedItemRow[]>(`/v1/shares/${shareToken}/items`, { headers: viewer(viewerToken) }),
  updateSharedItem: (shareToken: string, itemId: string, viewerToken: string, body: { purchased?: boolean; purchasedQuantity?: number; note?: string; displayName?: string; shareName?: boolean }) => request<SharedItemRow>(`/v1/shares/${shareToken}/items/${itemId}/state`, { method: 'PUT', headers: viewer(viewerToken), body: JSON.stringify(body) }),
}
