/// <reference types="vite/client" />

interface GoogleCredentialResponse { credential: string }
interface GoogleAccountsID {
  initialize(options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void
  renderButton(element: HTMLElement, options: Record<string, string | number | boolean>): void
}
interface Window { google?: { accounts: { id: GoogleAccountsID } } }
