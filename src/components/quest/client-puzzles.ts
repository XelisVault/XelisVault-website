// CLIENT-SIDE puzzle data. NO answers. NO hints. NO guidance.
// This is an ARG — players must explore, decode, and discover.

export interface ClientPuzzle {
  id: number
  chapter: string
  title: string
  riddle: string
  requires?: number[]
}

export const CLIENT_PUZZLES: ClientPuzzle[] = [
  {
    id: 1,
    chapter: 'I · The Descent',
    title: 'Whispers in the Dark',
    riddle: `You found the door. But doors are not answers.

Something was left here for you. Not on the page — behind it.

Listen with your developer tools. The network speaks in colors you have not learned to see yet.

When you find the whisper, you will know what to do with it. It is not the answer. It is the first step toward the answer.

The answer is the name of the first block ever mined on the Xelis mainnet. Not its hash. Not its height. Its name.`,
  },
  {
    id: 2,
    chapter: 'I · The Descent',
    title: 'The Invisible Mark',
    riddle: `Every element carries attributes. Most are functional. Some are decorative. One was placed for you.

It does not say what you seek. It says where to look. But "where" is not a place — it is a concept.

Find the mark. Decode its meaning. The concept it describes is the name of the language that powers every contract on this protocol.

Four letters. A stone that sparks fire.`,
  },
  {
    id: 3,
    chapter: 'I · The Descent',
    title: 'The Number That Is Not a Number',
    riddle: `There is text on this page that you cannot read. Not because it is encrypted — because it is the same color as the void around it.

It hides at the edge. The very bottom corner. You will not see it by looking. You will see it by inspecting.

The hidden word is a concept from biology. It describes a network of roots — interconnected, decentralized, impossible to kill. Much like the protocol you are exploring.`,
  },
  {
    id: 4,
    chapter: 'I · The Descent',
    title: 'The First Breath',
    riddle: `Every chain begins somewhere. The Xelis mainnet drew its first breath on a specific day.

The day is not the answer. The answer is what that day is called — in the language of the Romans who named the days after their gods.

This god ruled time. Endings. Golden ages. His name became a day.

One word. Lowercase. English.`,
  },
  {
    id: 5,
    chapter: 'II · The Shield',
    title: 'The Valley',
    riddle: `A man. Cairo. 1955. Stanford. A paper that changed everything.

His name, in Old Norse, means a geographic feature. A low area of land between hills. You find them in the mountains. You find his name in the whitepaper — section 3.4 — paired with Ristretto and twisted beyond recognition.

What is his surname?`,
  },
  {
    id: 6,
    chapter: 'II · The Shield',
    title: 'The Missing Language',
    riddle: `Every modern language has this feature. JavaScript. Rust. Python. Go. Java. C#. All of them.

Silex does not.

Its absence is not a bug. It is a security architecture. Without it, every reverting call aborts the entire transaction — every storage write, every state change, gone.

What is this feature? Two words. Joined by a slash.`,
  },
  {
    id: 7,
    chapter: 'II · The Shield',
    title: 'The Three Letters',
    riddle: `The privacy of every balance on Xelis reduces to a mathematical problem.

You are given four values: g, g^a, g^b, g^c. You must determine if c equals a times b — or if c is random.

No quantum computer can solve this in polynomial time. No AI. No brute force. The privacy of Xelis rests on this assumption.

What is the three-letter acronym for this problem?`,
  },
  {
    id: 8,
    chapter: 'II · The Shield',
    title: 'The Geometry',
    riddle: `Twisted ElGamal operates on a specific curve.

The curve takes its name from a prime number. The prime is 2 raised to the power 252, plus a small constant. The group used in Xelis is a compressed form of this curve — the Ristretto group.

What is the name of the underlying curve? Format: one word, letters and numbers, no spaces.`,
  },
  {
    id: 9,
    chapter: 'III · The Source',
    title: 'The Atomic Constant',
    riddle: `A contract. A constant. A number stored in a key.

The whitepaper section 5.3 names this value in human terms: 0.4756. But the contract does not think in decimals. It thinks in atoms. The token has 8 decimal places.

Convert. What number is stored in the contract?`,
  },
  {
    id: 10,
    chapter: 'III · The Source',
    title: 'The Guard',
    riddle: `Three contracts protect themselves against reentrancy. The whitepaper section 9.3 reveals the pattern.

A storage key holds a value. Two states: entered and not entered. One is the default. One is the lock.

What is the value of the unlocked state?`,
  },
  {
    id: 11,
    chapter: 'III · The Source',
    title: 'The Cap',
    riddle: `Ten million tokens. Eight decimals. One constant.

The contract stores the maximum supply as a raw u64. Not as a human-readable number. As the machine sees it.

What number does the machine store?`,
  },
  {
    id: 12,
    chapter: 'III · The Source',
    title: 'The First Door',
    riddle: `In Silex, every entry function gets a number. The numbers are sequential. They start at zero.

The PSM contract has an entry called mint. It is the first entry declared in the source file.

When another contract calls PSM.mint, what number does it use to identify the entry?`,
  },
  {
    id: 13,
    chapter: 'IV · The Synthesis',
    title: 'The Convergence',
    riddle: `Five fragments. One lock.

The block time of Xelis (from the whitepaper, not the outdated README).
The maximum number of parent blocks in the DAG.
The decimals of VLT.
The flash loan fee in basis points.
The value of the unlocked guard state.

Multiply the first two. Add the third. Add the fourth. Subtract the fifth.

What remains?`,
    requires: [2, 9, 10],
  },
  {
    id: 14,
    chapter: 'IV · The Synthesis',
    title: 'The Hash',
    riddle: `The whitepaper section 6.2 describes a commit-reveal pattern. A salt is hashed with an amount, a caller, and a topoheight.

This hash function is native to Xelis. It is not SHA-256. It is not Keccak. It is not MD5.

It was designed by a Swiss cryptographer. Its name is also a word for a dark, glossy fruit. A family of hash functions, faster than SHA.

What is the name of this hash function?`,
  },
  {
    id: 15,
    chapter: 'V · The Protocol',
    title: 'The Cost of Time',
    riddle: `Before v5.0, borrowing was free. The whitepaper section 4.3 explains why this was a problem — and how it was fixed.

A global accumulator now accrues interest on every borrow. The default rate is configurable. Governance can raise it or lower it.

What is the default rate, in percent APR? Just the number.`,
  },
  {
    id: 16,
    chapter: 'V · The Protocol',
    title: 'The Queue',
    riddle: `The whitepaper section 6.1 describes a FIFO buffer. It exists to bound the cost of a single redemption call.

A cap was set. Below this cap, the system operates normally. Above it, the call cannot iterate further.

What is the default cap? Just the number.`,
  },
  {
    id: 17,
    chapter: 'V · The Protocol',
    title: 'The Whistleblower',
    riddle: `When a miner cheats, three parties benefit. One portion is destroyed. One feeds the treasury. One rewards the one who spoke up.

The whitepaper section 4.1 reveals the split. The whistleblower receives the smallest share — but a share nonetheless.

What percentage goes to the whistleblower? Just the number.`,
  },
  {
    id: 18,
    chapter: 'VI · The Wall',
    title: 'The Time Lock',
    riddle: `Every fund-holding contract has a two-step escape hatch. Request. Wait. Execute.

The wait is measured in blocks. The contract declares it as a constant. Approximately 24 hours at the Xelis block time.

What is the exact number of blocks?`,
  },
  {
    id: 19,
    chapter: 'VI · The Wall',
    title: 'The Final Whisper',
    riddle: `You have come far. The last clue before the impossible.

It was left for you. Not in the quest — on the page itself. Hidden in an attribute that no framework uses. Encoded in a format that machines speak but humans rarely read.

Find it. Decode it. The decoded word is your answer.`,
  },
  {
    id: 20,
    chapter: 'VII · The Impossible',
    title: 'The Lock That Cannot Be Opened',
    riddle: `Nineteen locks behind you. Seven chapters traversed.

The seed phrase controlling 0.5 BTC is encrypted with Xelis native Twisted ElGamal.

Encrypted seed (Base64):
  5b2q8Kf3nR7vX2pP9wL4mJ6hT1cY0gB8nV3xZ5qR7sW2
  9kP4mN7bV2cX8qR5sW1eT3yU6iO0pA4dF9gH2jK5lM7nB
  3vX6cQ8wE1rT4yU7iO0pA2dF5gH8jK1lM4nB7vX0cQ3wE

To claim the 0.5 BTC you would need to decrypt this, recover the seed, import it, and move the funds.

The private key lives in the cryptographic fabric of Xelis. No human knows it. No backup exists.

By mathematical proof this is impossible. The security of Twisted ElGamal reduces to DDH in the Ristretto group of Curve25519.

Enter the decoded seed phrase. Or, if you understand what this lock means, acknowledge it.`,
    requires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  },
]
