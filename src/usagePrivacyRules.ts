export function safeUsagePath(path: string) {
  const clean = path.split(/[?#]/)[0].replace(/\/$/, '') || '/'
  if (clean.startsWith('/share/')) return '/share'
  const allowed = ['/', '/features', '/privacy', '/terms', '/support', '/legal', '/account-deletion', '/safety', '/press', '/login', '/share', '/reset-password', '/verify-email', '/app', '/app/home', '/app/wishlist', '/app/shared-list']
  return allowed.includes(clean) ? (clean === '/safety' ? '/community-safety' : clean) : '/'
}
