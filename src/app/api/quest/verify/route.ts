import { NextRequest, NextResponse } from 'next/server'
import { PUZZLES } from '@/components/quest/quest-data'

// All answers are server-side only — never shipped to the client.
// The client only knows if its answer is correct, not what the answer is.

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,]/g, '').replace(/-/g, ' ')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { puzzleId, answer } = body as { puzzleId: number; answer: string }

    if (typeof puzzleId !== 'number' || typeof answer !== 'string') {
      return NextResponse.json({ correct: false, error: 'invalid' }, { status: 400 })
    }

    const puzzle = PUZZLES.find(p => p.id === puzzleId)
    if (!puzzle) {
      return NextResponse.json({ correct: false, error: 'not_found' }, { status: 404 })
    }

    const userAnswer = normalize(answer)
    const correct = puzzle.answer.some(a => normalize(a) === userAnswer)

    return NextResponse.json({
      correct,
      reward: correct ? puzzle.reward : undefined,
    })
  } catch {
    return NextResponse.json({ correct: false, error: 'bad_request' }, { status: 400 })
  }
}
