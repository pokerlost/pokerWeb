// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
vi.mock('node:fs/promises', async (original) => {
  const actual = await original()
  return { ...actual, rename: vi.fn(actual.rename), lstat: vi.fn(actual.lstat) }
})
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
let root, source, lock, target, manifest, identity
async function save() {
  const bytes = JSON.stringify(manifest)
  identity = { clientCommit: manifest.clientCommit, manifestSha256: sha(bytes) }
  await fs.writeFile(resolve(source, 'artifact-manifest.json'), bytes)
  await fs.writeFile(lock, JSON.stringify(identity))
}
beforeEach(async () => {
  root = await fs.mkdtemp(resolve(tmpdir(), 'poker-artifact-'))
  source = resolve(root, 'source')
  lock = resolve(root, 'lock.json')
  target = resolve(root, 'installed')
  await fs.mkdir(resolve(source, 'assets'), { recursive: true })
  await fs.writeFile(resolve(source, 'flutter_bootstrap.js'), 'public bootstrap')
  await fs.writeFile(resolve(source, 'assets', 'data.json'), '{}')
  manifest = {
    clientCommit: 'a'.repeat(40),
    bridgeVersion: 1,
    files: {
      'flutter_bootstrap.js': sha('public bootstrap'),
      'assets/data.json': sha('{}'),
    },
  }
  await save()
})
afterEach(async () => {
  vi.restoreAllMocks()
  await fs.rm(root, { recursive: true, force: true })
})
it('installs a checksummed nested artifact and safely reuses exactly those bytes', async () => {
  const { installGame } = await import('./install-game.mjs')
  expect(await installGame(source, lock, target)).toEqual(manifest)
  expect(await installGame(source, lock, target)).toEqual(manifest)
  expect(
    await fs.readFile(resolve(target, identity.manifestSha256, 'assets/data.json'), 'utf8'),
  ).toBe('{}')
})
it.each(['manifestSha256', 'clientCommit'])(
  'rejects a mutable or malformed %s lock',
  async (key) => {
    const { installGame } = await import('./install-game.mjs')
    await fs.writeFile(lock, JSON.stringify({ ...identity, [key]: 'main' }))
    await expect(installGame(source, lock, target)).rejects.toThrow('immutable')
  },
)
it.each(['checksum', 'revision', 'bridge'])('rejects incompatible %s identity', async (kind) => {
  const { installGame } = await import('./install-game.mjs')
  if (kind === 'checksum') identity.manifestSha256 = 'b'.repeat(64)
  if (kind === 'revision') identity.clientCommit = 'b'.repeat(40)
  if (kind === 'bridge') {
    manifest.bridgeVersion = 2
    await save()
  }
  await fs.writeFile(lock, JSON.stringify(identity))
  await expect(installGame(source, lock, target)).rejects.toThrow('identity mismatch')
})
it.each(['extra', 'missing', 'bootstrap', 'changed'])(
  'rejects %s files before installation',
  async (kind) => {
    const { installGame } = await import('./install-game.mjs')
    if (kind === 'extra') await fs.writeFile(resolve(source, 'untracked'), 'not approved')
    if (kind === 'missing') await fs.rm(resolve(source, 'assets/data.json'))
    if (kind === 'bootstrap') {
      delete manifest.files['flutter_bootstrap.js']
      await save()
    }
    if (kind === 'changed') await fs.writeFile(resolve(source, 'assets/data.json'), 'changed')
    await expect(installGame(source, lock, target)).rejects.toThrow(
      kind === 'changed' ? 'checksum' : 'inventory',
    )
    await expect(fs.lstat(target)).rejects.toMatchObject({ code: 'ENOENT' })
  },
)
it.each(['../escape', '', '/absolute'])('rejects path escape %s', async (name) => {
  const { installGame } = await import('./install-game.mjs')
  manifest.files[name] = sha('unsafe')
  await save()
  await expect(installGame(source, lock, target)).rejects.toThrow('path escape')
})
it('rejects both nested symlinks and a symlink artifact root', async () => {
  const { installGame } = await import('./install-game.mjs')
  await fs.symlink(lock, resolve(source, 'link'))
  await expect(installGame(source, lock, target)).rejects.toThrow('symlinks')
  await fs.rm(resolve(source, 'link'))
  const link = resolve(root, 'source-link')
  await fs.symlink(source, link)
  await expect(installGame(link, lock, target)).rejects.toThrow('symlinks')
})
it('detects a previously installed artifact or manifest being modified', async () => {
  const { installGame } = await import('./install-game.mjs')
  await installGame(source, lock, target)
  const directory = resolve(target, identity.manifestSha256)
  await fs.writeFile(resolve(directory, 'assets/data.json'), 'changed')
  await expect(installGame(source, lock, target)).rejects.toThrow('checksum')
  await fs.writeFile(resolve(directory, 'assets/data.json'), '{}')
  await fs.writeFile(resolve(directory, 'artifact-manifest.json'), 'changed')
  await expect(installGame(source, lock, target)).rejects.toThrow('manifest mismatch')
})
it('does not suppress filesystem access failures and cleans staging after a failed atomic rename', async () => {
  const { installGame } = await import('./install-game.mjs')
  const actual = await vi.importActual('node:fs/promises')
  // The external I/O boundary fails only for the installation directory.
  vi.mocked(fs.lstat).mockImplementation(async (path) => {
    if (String(path) === resolve(target, identity.manifestSha256))
      throw Object.assign(new Error('denied'), { code: 'EACCES' })
    return actual.lstat(path)
  })
  await expect(installGame(source, lock, target)).rejects.toThrow('denied')
  vi.mocked(fs.lstat).mockImplementation(actual.lstat)
  vi.mocked(fs.rename).mockRejectedValueOnce(new Error('atomic rename failed'))
  await expect(installGame(source, lock, target)).rejects.toThrow('atomic rename failed')
  expect(await fs.readdir(target)).toEqual([])
})
it('executes the CLI argument boundary with explicit paths and default artifact locations', async () => {
  const args = process.argv
  const cwd = process.cwd()
  const env = process.env.POKER_GAME_ARTIFACT
  try {
    process.argv = [args[0], resolve('tools/install-game.mjs'), source, lock, target]
    vi.resetModules()
    await import('./install-game.mjs')
    process.chdir(root)
    await fs.copyFile(lock, resolve(root, 'game-artifact.lock.json'))
    process.argv = [args[0], resolve(cwd, 'tools/install-game.mjs')]
    process.env.POKER_GAME_ARTIFACT = source
    vi.resetModules()
    await import('./install-game.mjs')
    delete process.env.POKER_GAME_ARTIFACT
    // A controlled working directory keeps the default relative lookup inside this test's temp tree.
    const workspace = resolve(root, 'web')
    await fs.mkdir(workspace)
    await fs.mkdir(resolve(root, 'pokerClient/dist'), { recursive: true })
    await fs.cp(source, resolve(root, 'pokerClient/dist/poker-game-web'), { recursive: true })
    await fs.copyFile(lock, resolve(workspace, 'game-artifact.lock.json'))
    process.chdir(workspace)
    vi.resetModules()
    await import('./install-game.mjs')
    expect(
      await fs.readFile(
        resolve(workspace, 'public/game', identity.manifestSha256, 'flutter_bootstrap.js'),
        'utf8',
      ),
    ).toBe('public bootstrap')
  } finally {
    process.chdir(cwd)
    process.argv = args
    if (env === undefined) delete process.env.POKER_GAME_ARTIFACT
    else process.env.POKER_GAME_ARTIFACT = env
  }
})
