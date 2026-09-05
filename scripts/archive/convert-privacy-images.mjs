// Convert generated PNGs to optimized JPGs + build favicon set
// Run: node scripts/convert-privacy-images.mjs
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const TMP = '/home/z/my-project/scripts/gen-img-tmp'
const OUT = '/home/z/my-project/public/images/privacy'
const APP = '/home/z/my-project/src/app'
fs.mkdirSync(OUT, { recursive: true })

const names = [
  'hero-privacy', 'crypto-layers', 'encrypted-transfer',
  'private-governance', 'oracle-precision', 'steady-emission', 'cipher-texture',
]

console.log('== JPG conversion ==')
for (const n of names) {
  const src = path.join(TMP, n + '.png')
  const dst = path.join(OUT, n + '.jpg')
  await sharp(src)
    .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(dst)
  const kb = (fs.statSync(dst).size / 1024).toFixed(0)
  console.log(`OK ${n}.jpg ${kb}KB`)
}

console.log('== Favicon set ==')

// ── XelisVault icon SVG: ink shield + champagne V + gold ring ──
// Square 64 viewBox, reads clearly at 16px.
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E8C87A"/>
      <stop offset="1" stop-color="#B98A3E"/>
    </linearGradient>
  </defs>
  <!-- warm ink background, rounded square -->
  <rect width="64" height="64" rx="12" fill="#1C1915"/>
  <rect x="1.5" y="1.5" width="61" height="61" rx="10.5" fill="none" stroke="#B98A3E" stroke-opacity="0.55" stroke-width="1.5"/>
  <!-- shield silhouette -->
  <path d="M32 8 L50 15 V32 C50 44.5 42.5 52.5 32 57 C21.5 52.5 14 44.5 14 32 V15 Z"
        fill="none" stroke="url(#g)" stroke-width="2.6" stroke-linejoin="round"/>
  <!-- the V monogram inside -->
  <path d="M23 21 L32 40.5 L41 21"
        fill="none" stroke="url(#g)" stroke-width="3.4" stroke-linecap="square" stroke-linejoin="miter"/>
  <!-- keystone tick above the V -->
  <path d="M28.5 26.5 L32 18 L35.5 26.5"
        fill="none" stroke="url(#g)" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" opacity="0.85"/>
</svg>`

// app icon (favicon for modern browsers)
fs.writeFileSync(path.join(APP, 'icon.svg'), iconSvg)

// PNG renderings at standard favicon sizes
for (const size of [32, 192, 512]) {
  await sharp(Buffer.from(iconSvg), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(path.join(APP, `icon${size === 32 ? '' : '-' + size}.png`))
  console.log(`OK icon${size === 32 ? '' : '-' + size}.png`)
}

// apple-icon 180x180 (opaque, safe-area padded)
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#1C1915"/>
  <g transform="translate(4.5,4.5) scale(0.86)">
    <path d="M32 8 L50 15 V32 C50 44.5 42.5 52.5 32 57 C21.5 52.5 14 44.5 14 32 V15 Z"
          fill="none" stroke="#D9B36A" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M23 21 L32 40.5 L41 21"
          fill="none" stroke="#D9B36A" stroke-width="3.6" stroke-linecap="square"/>
    <path d="M28.5 26.5 L32 18 L35.5 26.5"
          fill="none" stroke="#D9B36A" stroke-width="2.1" stroke-linecap="square" opacity="0.85"/>
  </g>
</svg>`
await sharp(Buffer.from(appleSvg), { density: 300 })
  .resize(180, 180)
  .png()
  .toFile(path.join(APP, 'apple-icon.png'))
console.log('OK apple-icon.png')

// classic favicon.ico (16+32+48) for legacy browsers
const icoSizes = [16, 32, 48]
const pngBuffers = []
for (const s of icoSizes) {
  pngBuffers.push(await sharp(Buffer.from(iconSvg), { density: 300 }).resize(s, s).png().toBuffer())
}
// ICO container: header + entries per image + PNG data
function buildIco(buffers, sizes) {
  const count = buffers.length
  let offset = 6 + 16 * count
  const entries = []
  const datas = []
  for (let i = 0; i < count; i++) {
    const s = sizes[i]
    const buf = buffers[i]
    entries.push(Buffer.alloc(16))
    const e = entries[i]
    e.writeUInt8(s >= 256 ? 0 : s, 0)
    e.writeUInt8(s >= 256 ? 0 : s, 1)
    e.writeUInt8(0, 2) // palette
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4)  // color planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(buf.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += buf.length
    datas.push(buf)
  }
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(count, 4)
  return Buffer.concat([header, ...entries, ...datas])
}
fs.writeFileSync('/home/z/my-project/public/favicon.ico', buildIco(pngBuffers, icoSizes))
console.log('OK favicon.ico')

console.log('ALL DONE')
