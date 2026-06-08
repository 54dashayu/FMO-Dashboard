import {
  createReadStream,
  existsSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import { createServer, get } from 'node:http'
import { networkInterfaces } from 'node:os'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { spawn } from 'node:child_process'

const root = resolve(process.cwd(), 'app')
const pidFile = resolve(process.cwd(), 'fmo-dashboard.pid')
const stateFile = resolve(process.cwd(), 'fmo-dashboard-state.json')
const preferredPort = Number(process.env.PORT || 5180)
const host = process.env.HOST || '0.0.0.0'
let closeTimer = null

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2'
}

function isInsideRoot(filePath) {
  const relative = normalize(filePath).replace(root, '')
  return relative === '' || relative.startsWith(sep)
}

function resolveRequestPath(url = '/') {
  const parsedUrl = new URL(url, `http://${host}`)
  const decodedPath = decodeURIComponent(parsedUrl.pathname)
  const filePath = resolve(root, `.${decodedPath}`)

  if (!isInsideRoot(filePath)) return join(root, 'index.html')
  if (existsSync(filePath) && statSync(filePath).isFile()) return filePath

  return join(root, 'index.html')
}

function openBrowser(url) {
  if (process.env.NO_OPEN === '1') return

  const command =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]]

  spawn(command[0], command[1], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  }).unref()
}

function isProcessAlive(pid) {
  if (!pid || pid === process.pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function openExistingInstance() {
  if (!existsSync(stateFile)) return false

  try {
    const state = JSON.parse(readFileSync(stateFile, 'utf8'))
    const port = Number(state.port)
    const pid = Number(state.pid)
    if (!port || !isProcessAlive(pid)) return false

    const healthUrl = `http://127.0.0.1:${port}/__health`
    if (!(await requestHealthCheck(healthUrl))) return false

    openBrowser(`http://127.0.0.1:${port}/`)
    console.log(`FMO仪表盘 is already running at http://127.0.0.1:${port}/`)
    return true
  } catch {
    return false
  }
}

function requestHealthCheck(url) {
  return new Promise((resolveHealthCheck) => {
    const request = get(url, (response) => {
      response.resume()
      resolveHealthCheck(response.statusCode >= 200 && response.statusCode < 300)
    })

    request.setTimeout(1200, () => {
      request.destroy()
      resolveHealthCheck(false)
    })
    request.on('error', () => resolveHealthCheck(false))
  })
}

function getLanAddresses(port) {
  return Object.values(networkInterfaces())
    .flat()
    .filter((item) => item && item.family === 'IPv4' && !item.internal)
    .map((item) => `http://${item.address}:${port}/`)
}

function createAppServer() {
  return createServer((request, response) => {
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }

    if (request.url === '/__health') {
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ ok: true, pid: process.pid, port: selectedPort }))
      return
    }

    if (request.url === '/__portable-client-closed') {
      response.statusCode = 204
      response.end()
      closeTimer = setTimeout(() => {
        cleanup()
        process.exit(0)
      }, 8000)
      return
    }

    const filePath = resolveRequestPath(request.url)
    const ext = extname(filePath).toLowerCase()

    response.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    response.setHeader('Cache-Control', ext === '.html' ? 'no-store' : 'public, max-age=3600')

    createReadStream(filePath)
      .on('error', () => {
        response.statusCode = 500
        response.end('Failed to read file')
      })
      .pipe(response)
  })
}

function listen(server, port) {
  return new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(port, host, () => {
      server.off('error', rejectListen)
      resolveListen(port)
    })
  })
}

let server = null
let selectedPort = preferredPort

if (await openExistingInstance()) {
  process.exit(0)
}

for (let offset = 0; offset < 20; offset += 1) {
  server = createAppServer()
  selectedPort = preferredPort + offset

  try {
    await listen(server, selectedPort)
    break
  } catch (error) {
    server.close()
    if (error.code !== 'EADDRINUSE' || offset === 19) throw error
  }
}

const localUrl = `http://127.0.0.1:${selectedPort}/`
const lanUrls = getLanAddresses(selectedPort)

writeFileSync(pidFile, String(process.pid), 'utf8')
writeFileSync(
  stateFile,
  JSON.stringify({ pid: process.pid, port: selectedPort, startedAt: new Date().toISOString() }),
  'utf8'
)

console.log(`FMO仪表盘 Portable is running at ${localUrl}`)
if (host === '0.0.0.0') {
  console.log('LAN access addresses:')
  for (const url of lanUrls) {
    console.log(`  ${url}`)
  }
}
console.log('Close this window to stop FMO仪表盘.')
openBrowser(localUrl)

function cleanup() {
  try {
    unlinkSync(pidFile)
  } catch {
    // Ignore cleanup errors when the file was already removed.
  }
  try {
    unlinkSync(stateFile)
  } catch {
    // Ignore cleanup errors when the file was already removed.
  }
}

process.on('exit', cleanup)
process.on('SIGINT', () => {
  cleanup()
  process.exit(0)
})
process.on('SIGTERM', () => {
  cleanup()
  process.exit(0)
})
