import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' }

export function createLocalServer(directory) {
  const root = resolve(directory)
  return createServer((request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('Cache-Control', 'no-store')
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end('Method not allowed'); return
    }
    let path
    try { path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname) }
    catch { response.writeHead(400); response.end('Invalid path'); return }
    if (path.includes('\\') || path.includes('\0')) {
      response.writeHead(400); response.end('Invalid path'); return
    }
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path))
    if (!file.startsWith(root + sep)) { response.writeHead(403); response.end('Access denied'); return }
    try {
      const info = statSync(file)
      if (!info.isFile()) throw new Error('Not a file')
      response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Content-Length': info.size })
      if (request.method === 'HEAD') { response.end(); return }
      const stream = createReadStream(file)
      stream.on('error', () => response.destroy())
      stream.pipe(response)
    } catch { response.writeHead(404); response.end('File not found') }
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../dist/', import.meta.url))
  if (!existsSync(resolve(root, 'index.html'))) {
    console.error('The app build is missing. Run npm ci, then npm run build, and start again.')
    process.exitCode = 1
  } else {
    const server = createLocalServer(root)
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE'
        ? 'Port 5173 is already in use. Stop the other MineSafe or Vite server with Ctrl+C, then start again.'
        : 'MineSafe could not start: ' + error.message)
      process.exitCode = 1
    })
    server.listen(5173, '127.0.0.1', () => {
      const url = 'http://localhost:5173'
      console.log('MineSafe XR is running at ' + url + '\nKeep this window open. Press Ctrl+C to stop.')
      if (process.argv.includes('--open') && process.platform === 'win32') {
        const child = spawn('cmd.exe', ['/d', '/s', '/c', 'start "" "' + url + '"'], { stdio: 'ignore', windowsHide: true })
        child.on('error', () => console.log('Open ' + url + ' in your browser.'))
        child.unref()
      }
    })
    process.once('SIGINT', () => server.close(() => { process.exitCode = 0 }))
  }
}
