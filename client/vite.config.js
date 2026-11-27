import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Hosting platforms set one of these during their builds.
const HOSTED_BUILD = Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.CF_PAGES)

// VITE_API_URL is inlined at build time. If it is missing on the host, the
// bundle silently falls back to the local .env value (http://localhost:4000),
// so every visitor's browser calls their own machine and login can't work.
// Fail the hosted build loudly instead of shipping a dead site.
function assertDeployableApiUrl(env) {
  const url = env.VITE_API_URL || ''
  let problem = null
  if (!url) problem = 'is not set'
  else if (!url.startsWith('https://')) problem = 'must be an https:// URL'
  else if (/localhost|127\.0\.0\.1|\[::1\]/.test(url)) problem = 'points at localhost'

  if (problem) {
    throw new Error(
      `VITE_API_URL ${problem} (got "${url}"). ` +
      'Set it in the hosting project\'s environment variables (e.g. https://<api-host>/api) and redeploy.'
    )
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build' && HOSTED_BUILD) {
    assertDeployableApiUrl(loadEnv(mode, process.cwd(), 'VITE_'))
  }
  return {
    plugins: [react()],
  }
})
