// Process real photos into the 7 site slots: smart crop to section aspect,
// tonal harmonization toward the champagne-on-ink palette, ink vignette.
// Run: node scripts/process-real-images.mjs
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const BASE = '/home/z/my-project/scripts/img-search'
const OUT = '/home/z/my-project/public/images/privacy'
fs.mkdirSync(OUT, { recursive: true })

// slot → { src, w, h, sat, bright, position }
const JOBS = {
  // hero — 4/5 portrait, gold bars on black (Denver Post)
  'hero-privacy':       { src: 'cand2/gold-vault-2.jpg', w: 1000, h: 1250, sat: 1.02, bright: 0.9,  position: 'centre' },
  // solution — 3/4 portrait, dim data center corridor (Shutterstock)
  'crypto-layers':      { src: 'cand/datacenter-1.jpg',  w: 900,  h: 1200, sat: 0.5,  bright: 0.8,  position: 'attention' },
  // xusd — 4/5 portrait, golden padlock w/ key (Wallpaper Abyss)
  'encrypted-transfer': { src: 'cand2/padlock-1.jpg',    w: 900,  h: 1125, sat: 0.95, bright: 0.9,  position: 'attention' },
  // vlt — 4/3 landscape, stark dark boardroom (Wallpaper)
  'private-governance': { src: 'cand/boardroom-0.jpg',   w: 1080, h: 810,  sat: 0.8,  bright: 0.85, position: 'attention' },
  // oracle — 3/4 portrait, mechanical watch movement (Chrono24)
  'oracle-precision':   { src: 'cand2/watchmov-4.jpg',   w: 900,  h: 1200, sat: 0.85, bright: 0.82, position: 'attention' },
  // mining — 4/3 landscape, golden bokeh (Pexels)
  'steady-emission':    { src: 'cand/bokeh-0.jpeg',      w: 1080, h: 810,  sat: 0.95, bright: 0.82, position: 'attention' },
  // cta band background — brushed metal (Unsplash), served at 0.16 opacity
  'cipher-texture':     { src: 'cand/metal-texture-0.jpg', w: 1920, h: 1080, sat: 0.3, bright: 0.72, position: 'centre' },
}

// subtle ink vignette — deepens edges so overlaid captions stay legible
const vignette = (w, h) => Buffer.from(
  `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <radialGradient id="v" cx="0.5" cy="0.45" r="0.75">
         <stop offset="0.55" stop-color="rgba(18,14,10,0)"/>
         <stop offset="1" stop-color="rgba(18,14,10,0.55)"/>
       </radialGradient>
     </defs>
     <rect width="${w}" height="${h}" fill="url(#v)"/>
   </svg>`
)

// warm champagne cast — unifies cool/blue sources with the gold palette
const warmCast = (w, h) => Buffer.from(
  `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="rgba(232,200,122,0.10)"/>
         <stop offset="1" stop-color="rgba(26,20,12,0.14)"/>
       </linearGradient>
     </defs>
     <rect width="${w}" height="${h}" fill="url(#w)"/>
   </svg>`
)

for (const [name, job] of Object.entries(JOBS)) {
  const src = path.join(BASE, job.src)
  if (!fs.existsSync(src)) {
    console.log(`SKIP ${name} — missing ${job.src}`)
    continue
  }
  const dst = path.join(OUT, `${name}.jpg`)
  await sharp(src)
    .rotate() // respect EXIF
    .resize(job.w, job.h, { fit: 'cover', position: job.position === 'attention' ? sharp.strategy.attention : 'centre' })
    .modulate({ saturation: job.sat, brightness: job.bright })
    .composite([
      { input: warmCast(job.w, job.h), blend: 'over' },
      { input: vignette(job.w, job.h), blend: 'multiply' },
    ])
    .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(dst)
  const kb = (fs.statSync(dst).size / 1024).toFixed(0)
  console.log(`OK ${name}.jpg  ${job.w}x${job.h}  ${kb}KB  ← ${job.src}`)
}
console.log('DONE')
