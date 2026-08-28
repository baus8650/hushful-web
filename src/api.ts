import type { AccountSharedWishlist, CurrentUser, ShareViewResponse, SharedItemRow, TokenResponse, Wishlist, WishlistItem } from './types'

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

export const api = {
  register: (email: string, password: string, displayName: string) => request<TokenResponse>('/v1/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) }),
  login: (email: string, password: string) => request<TokenResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  googleLogin: (idToken: string) => request<TokenResponse>('/v1/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
  forgotPassword: (email: string) => request<{ message: string }>('/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => request<{ message: string }>('/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  me: (token: string) => request<CurrentUser>('/v1/me', { headers: auth(token) }),
  updateProfile: (token: string, displayName: string) => request<CurrentUser>('/v1/me', { method: 'PATCH', headers: auth(token), body: JSON.stringify({ displayName }) }),
  wishlists: (token: string) => request<Wishlist[]>('/v1/wishlists', { headers: auth(token) }),
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
