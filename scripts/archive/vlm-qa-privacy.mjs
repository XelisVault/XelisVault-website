// VLM QA: analyze screenshots for privacy theme + text legibility
// Run: node scripts/vlm-qa-privacy.mjs
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import sharp from 'sharp'

const SHOTS = '/home/z/my-project/scripts/qa-shots'
const TMP = '/home/z/my-project/scripts/qa-shots/vlm-tmp'
fs.mkdirSync(TMP, { recursive: true })

const files = [
  'priv-01-hero.png',
  'priv-03-solution.png',
  'priv-04-xusd.png',
  'priv-05-mobile-hero.png',
  'priv-07-app.png',
]

// Downscale to keep payload reasonable
const inputs = []
for (const f of files) {
  const src = `${SHOTS}/${f}`
  if (!fs.existsSync(src)) { console.log('MISSING', f); continue }
  const dst = `${TMP}/${f.replace('.png', '.jpg')}`
  const meta = await sharp(src).metadata()
  await sharp(src).resize({ width: Math.min(1400, meta.width ?? 1400) }).jpeg({ quality: 80 }).toFile(dst)
  inputs.push({ file: f, path: dst })
}

const zai = await ZAI.create()

const PROMPT = `You are a strict web-UI QA reviewer for "XELIS Vault", a confidential-finance platform (dark ink + champagne gold private-banking aesthetic). For EACH screenshot (in order), answer concisely:
1. PRIVACY THEME: do the photography/images clearly evoke confidentiality/encryption/sealed vaults/anonymity? (yes/no + 1 line)
2. LEGIBILITY: list any text that is hard to read because it is too dim / low contrast against its background. Quote the text and where it is. If none, say "none".
3. VISUAL DEFECTS: broken images, empty frames, overlapping text, clipped text. If none, "none".
Keep each screenshot's answer to max 4 lines. Be specific, not generic.`

const content = [{ type: 'text', text: PROMPT }]
for (const i of inputs) {
  const b64 = fs.readFileSync(i.path).toString('base64')
  content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } })
}

const res = await zai.chat.completions.create({
  messages: [{ role: 'user', content }],
  temperature: 0.2,
})

console.log(res.choices[0].message.content)
