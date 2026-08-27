import type { SharedWishlist } from './types'

const tokenKey = 'hushful.accessToken'
export const authStorage = {
  get: () => localStorage.getItem(tokenKey),
  set: (token: string) => localStorage.setItem(tokenKey, token),
  clear: () => localStorage.removeItem(tokenKey),
}

const sharesKey = (accountId: string) => `hushful.shares.${accountId}`
const viewerKey = (accountId: string, shareToken: string) => `hushful.viewer.${accountId}.${shareToken}`
export const shareStorage = {
  list(accountId: string): SharedWishlist[] {
    try { return JSON.parse(localStorage.getItem(sharesKey(accountId)) ?? '[]') as SharedWishlist[] } catch { return [] }
  },
  save(accountId: string, share: SharedWishlist, viewerToken: string) {
    const saved = this.list(accountId).filter((item) => item.shareToken !== share.shareToken)
    saved.push(share)
    saved.sort((a, b) => a.title.localeCompare(b.title))
    localStorage.setItem(sharesKey(accountId), JSON.stringify(saved))
    localStorage.setItem(viewerKey(accountId, share.shareToken), viewerToken)
  },
  remove(accountId: string, shareToken: string) {
    localStorage.setItem(sharesKey(accountId), JSON.stringify(this.list(accountId).filter((item) => item.shareToken !== shareToken)))
    localStorage.removeItem(viewerKey(accountId, shareToken))
  },
  viewerToken: (accountId: string, shareToken: string) => localStorage.getItem(viewerKey(accountId, shareToken)),
}
