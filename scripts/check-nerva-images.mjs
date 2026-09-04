import ZAI from '/home/z/.bun/install/global/node_modules/z-ai-web-dev-sdk/dist/index.js'
import fs from 'fs'

const files = ['chip-glow.jpg', 'pcb-macro.jpg', 'racks-blue.jpg', 'datacenter-corridor.jpg']

async function main() {
  const zai = await ZAI.create()
  for (const f of files) {
    const b64 = fs.readFileSync(`/tmp/vlm-${f}`).toString('base64')
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
              { type: 'text', text: 'Answer in max 3 short lines: (1) real photo or AI/3D render? (2) any watermark/text overlay? (3) quality for a pro tech website background: good/ok/bad.' },
            ],
          },
        ],
        thinking: { type: 'disabled' },
      })
      console.log(`=== ${f} ===`)
      console.log(completion.choices[0]?.message?.content?.trim())
      console.log()
    } catch (e) {
      console.log(`=== ${f} === ERROR: ${e.message}`)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
