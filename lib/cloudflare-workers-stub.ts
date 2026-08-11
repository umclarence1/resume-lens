// Vercel does not provide Cloudflare runtime bindings. The Studio falls back
// to encrypted-by-possession, device-local Passport storage on that platform.
export const env = { DB: undefined };
