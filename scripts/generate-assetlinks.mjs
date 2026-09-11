import { mkdir, writeFile } from 'node:fs/promises'

const fingerprint = process.env.ANDROID_APP_SIGNING_SHA256?.trim().toUpperCase()
const fingerprintPattern = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/

if (!fingerprint || !fingerprintPattern.test(fingerprint)) {
  console.error('ANDROID_APP_SIGNING_SHA256 must be the 32-byte colon-separated SHA-256 fingerprint from Google Play App Signing.')
  process.exit(1)
}

const directory = new URL('../public/.well-known/', import.meta.url)
await mkdir(directory, { recursive: true })
await writeFile(new URL('assetlinks.json', directory), `${JSON.stringify([{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: {
    namespace: 'android_app',
    package_name: 'com.hushful.app',
    sha256_cert_fingerprints: [fingerprint],
  },
}], null, 2)}\n`)
