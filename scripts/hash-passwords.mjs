// Generates PBKDF2 password hashes for seed users and prints UPDATE statements.
// Usage: node scripts/hash-passwords.mjs
// Default demo password for all seeded accounts: "Password@123"
const ITER = 100000

function b64(buf) {
  return Buffer.from(new Uint8Array(buf)).toString('base64')
}

async function hash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, key, 256)
  return `pbkdf2$${ITER}$${b64(salt.buffer)}$${b64(bits)}`
}

const accounts = [
  ['admin@primecast.example', 'Admin@123'],
  ['manager@primecast.example', 'Password@123'],
  ['employee@primecast.example', 'Password@123'],
  ['meera@primecast.example', 'Password@123'],
  ['rahul@primecast.example', 'Password@123'],
]

const lines = []
for (const [email, pw] of accounts) {
  const h = await hash(pw)
  lines.push(`UPDATE users SET password_hash='${h}' WHERE email='${email}';`)
}
console.log(lines.join('\n'))
