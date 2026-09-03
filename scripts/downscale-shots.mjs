// Downscale QA screenshots for VLM input
import sharp from 'sharp'
import fs from 'fs'

const SHOTS = '/home/z/my-project/scripts/qa-shots'
const TMP = '/home/z/my-project/scripts/qa-shots/vlm-tmp'
fs.mkdirSync(TMP, { recursive: true })

const files = [
  'priv-01-hero.png', 'priv-03-solution.png', 'priv-04-xusd.png',
  'priv-05-mobile-hero.png', 'priv-07-app.png', 'priv-02-full.png',
]

for (const f of files) {
  const src = `${SHOTS}/${f}`
  if (!fs.existsSync(src)) { console.log('MISSING', f); continue }
  const dst = `${TMP}/${f.replace('.png', '.jpg')}`
  const meta = await sharp(src).metadata()
  const width = Math.min(1100, meta.width ?? 1100)
  await sharp(src).resize({ width }).jpeg({ quality: 78 }).toFile(dst)
  console.log('OK', f, '->', width + 'w', Math.round(fs.statSync(dst).size / 1024) + 'KB')
}
