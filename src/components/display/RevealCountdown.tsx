import { DrawMode, Prize } from '../../types/lottery'

interface RevealCountdownProps {
    seconds: number
    prize?: Prize | null
    drawMode: DrawMode
}

export function RevealCountdown({ seconds, prize, drawMode }: RevealCountdownProps) {
    const showProgress = drawMode === 'one' && prize

    return (
        <div className="reveal-countdown">
            <div className="countdown-grid" />
            <div className="countdown-core">
                <div className="countdown-heart">❤</div>
                <div className="countdown-number">{seconds}</div>
            </div>
            <div className="countdown-label">REVEAL IN</div>
            {prize && (
                <div className="countdown-prize">
                    <span className="countdown-prize-icon">🎁</span>
                    <span className="countdown-prize-name">{prize.name}</span>
                    {showProgress && (
                        <span className="prize-progress">{prize.drawnCount}/{prize.quantity}</span>
                    )}
                </div>
            )}
            <div className="countdown-subtitle">Prepare for the reveal</div>
        </div>
    )
}
