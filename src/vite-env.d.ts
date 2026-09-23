/// <reference types="vite/client" />

interface GoogleCredentialResponse { credential: string }
interface GoogleAccountsID {
  initialize(options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void
  renderButton(element: HTMLElement, options: Record<string, string | number | boolean>): void
}
interface Window { google?: { accounts: { id: GoogleAccountsID } } }

interface AppleAuthorizationResponse {
  authorization: { id_token: string }
  user?: { name?: { firstName?: string; lastName?: string } }
}
interface AppleIDAuth {
  init(options: { clientId: string; scope: string; redirectURI: string; nonce: string; usePopup: boolean }): void
  signIn(): Promise<AppleAuthorizationResponse>
}
interface Window { AppleID?: { auth: AppleIDAuth } }
