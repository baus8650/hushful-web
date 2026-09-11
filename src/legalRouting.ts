export type PublicPage = 'privacy' | 'terms' | 'support' | 'account-deletion' | 'press' | 'safety'

export function legalRoute(pathname: string): PublicPage | null {
  const route = pathname.replace(/\/+$/, '') || '/'
  if (route === '/privacy') return 'privacy'
  if (route === '/terms') return 'terms'
  if (route === '/support') return 'support'
  if (route === '/account-deletion') return 'account-deletion'
  if (route === '/press') return 'press'
  if (route === '/safety') return 'safety'
  return null
}
