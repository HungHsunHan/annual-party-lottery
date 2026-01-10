import { useEffect, useState } from 'react'
import { Participant, Prize } from '../../types/lottery'

interface WinnerRevealProps {
    participants: Participant[]
    prize: Prize
}

// 紙花顏色
const CONFETTI_COLORS = [
    '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
    '#5f27cd', '#00d2d3', '#ff6b81', '#ffeaa7', '#74b9ff'
]

export function WinnerReveal({ participants, prize }: WinnerRevealProps) {
    const [confettiPieces, setConfettiPieces] = useState<Array<{
        id: number
        left: string
        color: string
        delay: string
        duration: string
    }>>([])

    useEffect(() => {
        // 生成紙花
        const pieces = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            delay: `${Math.random() * 2}s`,
            duration: `${2 + Math.random() * 2}s`
        }))
        setConfettiPieces(pieces)
    }, [])

    const multiple = participants.length > 1

    return (
        <div className="winner-reveal">
            {/* 紙花效果 */}
            <div className="winner-confetti">
                {confettiPieces.map(piece => (
                    <div
                        key={piece.id}
                        className="confetti-piece"
                        style={{
                            left: piece.left,
                            backgroundColor: piece.color,
                            animationDelay: piece.delay,
                            animationDuration: piece.duration
                        }}
                    />
                ))}
            </div>

            <div className="winner-badge">🎉 恭喜中獎 🎉</div>

            <div className="winner-prize-name">🎁 {prize.name}</div>

            {multiple ? (
                <div className="winner-grid">
                    {participants.map(participant => (
                        <div key={participant.id} className="winner-card-sm">
                            <div className="winner-name-sm">{participant.name}</div>
                            <div className="winner-dept-sm">{participant.department}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="winner-card">
                    <div className="winner-name">{participants[0]?.name}</div>
                    <div className="winner-dept">{participants[0]?.department}</div>
                </div>
            )}

            <div className="winner-emoji">🏆</div>
        </div>
    )
}
