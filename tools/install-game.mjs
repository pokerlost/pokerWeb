import { createHash } from 'node:crypto'
import { readFile, readdir, lstat, cp, mkdir, mkdtemp, rename, rm } from 'node:fs/promises'
import { resolve, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

async function verify(directory, manifest) {
  if ((await lstat(directory)).isSymbolicLink()) throw new Error('Artifact symlinks are forbidden')
  const actual = []
  async function inspect(current) {
    for (const name of await readdir(current)) {
      const path = resolve(current, name)
      const stat = await lstat(path)
      if (stat.isSymbolicLink()) throw new Error('Artifact symlinks are forbidden')
      if (stat.isDirectory()) await inspect(path)
      else actual.push(relative(directory, path).split(sep).join('/'))
    }
  }
  const expected = Object.keys(manifest.files)
  for (const name of expected) {
    const path = relative(directory, resolve(directory, name))
    if (path === '..' || path.startsWith('..' + sep) || path === '')
      throw new Error('Artifact path escape')
  }
  await inspect(directory)
  if (
    !expected.includes('flutter_bootstrap.js') ||
    actual
      .filter((path) => path !== 'artifact-manifest.json')
      .sort()
      .join('\n') !== expected.sort().join('\n')
  ) {
    throw new Error('Artifact inventory mismatch')
  }
  for (const name of expected) {
    const hash = createHash('sha256')
      .update(await readFile(resolve(directory, name)))
      .digest('hex')
    if (hash !== manifest.files[name]) throw new Error('Artifact checksum mismatch')
  }
}

export async function installGame(source, lockPath, targetParent) {
  const lock = JSON.parse(await readFile(lockPath, 'utf8'))
  if (!/^[0-9a-f]{64}$/.test(lock.manifestSha256) || !/^[0-9a-f]{40}$/.test(lock.clientCommit)) {
    throw new Error('Expected immutable artifact identity')
  }
  const bytes = await readFile(resolve(source, 'artifact-manifest.json'))
  const manifest = JSON.parse(bytes)
  if (
    createHash('sha256').update(bytes).digest('hex') !== lock.manifestSha256 ||
    manifest.clientCommit !== lock.clientCommit ||
    manifest.bridgeVersion !== 1
  ) {
    throw new Error('Game artifact identity mismatch')
  }
  await verify(source, manifest)
  const target = resolve(targetParent, lock.manifestSha256)
  try {
    await lstat(target)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    await mkdir(targetParent, { recursive: true })
    const staging = await mkdtemp(target + '.staging-')
    try {
      await cp(source, staging, { recursive: true })
      await rename(staging, target)
    } catch (error) {
      await rm(staging, { recursive: true, force: true })
      throw error
    }
  }
  await verify(target, manifest)
  if (!bytes.equals(await readFile(resolve(target, 'artifact-manifest.json')))) {
    throw new Error('Installed artifact manifest mismatch')
  }
  return manifest
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await installGame(
    resolve(
      process.argv[2] ?? process.env.POKER_GAME_ARTIFACT ?? '../pokerClient/dist/poker-game-web',
    ),
    resolve(process.argv[3] ?? 'game-artifact.lock.json'),
    resolve(process.argv[4] ?? 'public/game'),
  )
}
