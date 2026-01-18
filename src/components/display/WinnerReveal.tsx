import { useEffect, useState } from 'react'
import { DisplaySettings, DrawMode, Participant, Prize } from '../../types/lottery'

interface WinnerRevealProps {
    participants: Participant[]
    prize: Prize
    drawMode: DrawMode
    logo?: string
    settings: DisplaySettings['winner']
}

// Confetti palette (adjust to change theme colors)
const CONFETTI_COLORS = [
    '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
    '#5f27cd', '#00d2d3', '#ff6b81', '#ffeaa7', '#74b9ff'
]

export function WinnerReveal({
    participants,
    prize,
    drawMode,
    logo,
    settings
}: WinnerRevealProps) {
    const [confettiPieces, setConfettiPieces] = useState<Array<{
        id: number
        left: string
        color: string
        delay: string
        duration: string
    }>>([])

    useEffect(() => {
        if (!settings.showConfetti) {
            setConfettiPieces([])
            return
        }

        // 生成紙花
        const pieces = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            delay: `${Math.random() * 2}s`,
            duration: `${2 + Math.random() * 2}s`
        }))
        setConfettiPieces(pieces)
    }, [settings.showConfetti])

    const multiple = participants.length > 1
    const densityClass = participants.length >= 16
        ? 'dense'
        : participants.length >= 9
            ? 'compact'
            : ''
    const showPrizeName = settings.showPrizeName
    const showProgress = drawMode === 'one' && settings.showPrizeProgress
    const showPrizeBlock = showPrizeName || showProgress
    const showLogo = settings.showLogo && logo
    const showBadge = settings.badgeText.trim().length > 0
    const showTrophy = settings.showTrophy && settings.trophyEmoji.trim().length > 0
    const showHeader = showLogo || showPrizeBlock || showBadge

    return (
        <div className="winner-reveal">
            {/* 紙花效果 */}
            {settings.showConfetti && (
                <div className="winner-confetti">
                    {confettiPieces.map(piece => (
                        <div
                            key={piece.id}
                            className="confetti-piece"
                            style={{
                                left: piece.left, // Horizontal spread
                                backgroundColor: piece.color, // Confetti color
                                animationDelay: piece.delay, // Stagger timing
                                animationDuration: piece.duration // Fall speed
                            }}
                        />
                    ))}
                </div>
            )}

            {showHeader && (
                <div className="winner-header">
                    {showLogo && (
                        <img
                            src={`data:image/png;base64,${logo}`}
                            alt="Company Logo"
                            className="display-logo winner-logo"
                        />
                    )}
                    {showPrizeBlock && (
                        <div className="winner-prize-name">
                            {showPrizeName && (
                                <>
                                    🎁 {prize.name}
                                </>
                            )}
                            {showProgress && (
                                <span className="prize-progress">
                                    {prize.drawnCount}/{prize.quantity}
                                </span>
                            )}
                        </div>
                    )}
                    {showBadge && <div className="winner-badge">{settings.badgeText}</div>}
                </div>
            )}

            <div className="winner-list-frame">
                {multiple ? (
                    <div className={`winner-grid${densityClass ? ` ${densityClass}` : ''}`}>
                        {participants.map(participant => (
                            <div key={participant.id} className="winner-card-sm">
                                <div className="winner-name-sm">{participant.name}</div>
                                {settings.showDepartment && (
                                    <div className="winner-dept-sm">{participant.department}</div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="winner-card">
                        <div className="winner-name">{participants[0]?.name}</div>
                        {settings.showDepartment && (
                            <div className="winner-dept">{participants[0]?.department}</div>
                        )}
                    </div>
                )}
            </div>

            {showTrophy && <div className="winner-emoji">{settings.trophyEmoji}</div>}
        </div>
    )
}
