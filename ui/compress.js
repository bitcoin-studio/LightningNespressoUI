/**
 * Brotli compression for static files
 */

const {createReadStream, createWriteStream, readdir} = require('fs')
const {resolve, extname} = require('path')
const {pipeline} = require('stream')
const {promisify} = require('util')
const {createBrotliCompress} = require('zlib')

const pipe = promisify(pipeline)
const readDir = promisify(readdir)

async function getFiles(dir) {
  const dirents = await readDir(dir, {withFileTypes: true})
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return dirent.isDirectory() ? getFiles(res) : res
  }))
  return files
    .flat()
    // Binary files like JPEG, PNG, MP4, are already compressed with format-specific compression
    .filter((p) => extname(p) === '.css'
      || extname(p) === '.html'
      || extname(p) === '.js'
      || extname(p) === '.json'
      || extname(p) === '.svg')
}

module.exports = {
  brotliCompress: async (dirname) => {
    const results = []
    const files = await getFiles(dirname)
    console.log('Brotli compressed files:')
    files.forEach((input) => {
      console.log(input)
      const brotli = createBrotliCompress()
      const source = createReadStream(input)
      const destination = createWriteStream(`${input}.br`)
      results.push([source, brotli, destination])
    })
    await Promise.all(results.map((r) => pipe(r)))
  }
}
