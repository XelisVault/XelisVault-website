# Soundtrack files

Drop the Suno-generated tracks here with these **exact filenames**. The site
detects them automatically — every file is optional and the experience stays
silent (never broken) while a file is missing.

| File                | Length   | Plays during                                                     |
| ------------------- | -------- | ---------------------------------------------------------------- |
| `vault-opening.mp3` | ~48.5 s  | T-10s final countdown → the full Vault Opening ceremony           |
| `welcome.mp3`       | ~24 s    | the late-comer welcome sequence (compressed pacing)               |
| `ambient.mp3`       | 2–3 min  | quiet tension loop during the escalation hours before launch      |

## Sync map for `vault-opening.mp3`

Track position **0 = T-10s** (the moment the full-screen countdown appears).
The ceremony itself starts 10.0 s into the track. Landmarks the visuals are
timed to:

| Track time | Visual phase                                    |
| ---------- | ----------------------------------------------- |
| 0:00.0     | T-10s — giant cipher digits, shockwaves         |
| 0:10.0     | HOLD — the "0" freezes, glitches, collapses     |
| 0:11.3     | BOLTS — 12 bolts blow rapid-fire                |
| 0:12.9     | ROTATE — final half-turn of the wheel           |
| 0:14.5     | **BREACH — the drop, the door shatters**        |
| 0:16.8     | GENESIS — logo + BlockDAG constellation         |
| 0:19.8     | CHAIN — the blockchain chains itself            |
| 0:25.2     | TOUR — 9 modules, one every 1.75 s              |
| 0:41.2     | LIVE — "TESTNET LIVE" decodes, CTA              |
| 0:46.8     | outro tail over the live homepage               |

If the generated track lands its sections at slightly different times, the
animation constants (`launch-celebration.tsx`) get re-timed to match the
audio — the audio is the master, the visuals follow.

The full creative brief (lyrics, per-second timings, Suno style prompts) is
saved at `download/suno-brief-xelisvault.md`.
