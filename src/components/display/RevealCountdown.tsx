import { DisplaySettings, DrawMode, Prize } from '../../types/lottery'

interface RevealCountdownProps {
    seconds: number
    prize?: Prize | null
    drawMode: DrawMode
    logo?: string
    settings: DisplaySettings['countdown']
}

export function RevealCountdown({
    seconds,
    prize,
    drawMode,
    logo,
    settings
}: RevealCountdownProps) {
    const hasPrize = Boolean(prize)
    const showProgress = drawMode === 'one' && settings.showPrizeProgress
    const showPrizeName = settings.showPrizeName
    const showPrizeBlock = hasPrize && (showPrizeName || showProgress)
    const showLogo = settings.showLogo && Boolean(logo)
    const showLabel = settings.label.trim().length > 0
    const showSubtitle = settings.subtitle.trim().length > 0

    return (
        <div className="reveal-countdown">
            <div className="countdown-grid" />
            {showLogo && (
                <img
                    src={`data:image/png;base64,${logo}`}
                    alt="Company Logo"
                    className="display-logo countdown-logo"
                />
            )}
            <div className="countdown-core">
                <div className="countdown-heart">❤</div>
                <div className="countdown-number">{seconds}</div>
            </div>
            {showLabel && <div className="countdown-label">{settings.label}</div>}
            {showPrizeBlock && prize && (
                <div className="countdown-prize">
                    {showPrizeName && (
                        <>
                            <span className="countdown-prize-icon">🎁</span>
                            <span className="countdown-prize-name">{prize.name}</span>
                        </>
                    )}
                    {showProgress && (
                        <span className="prize-progress">{prize.drawnCount}/{prize.quantity}</span>
                    )}
                </div>
            )}
            {showSubtitle && <div className="countdown-subtitle">{settings.subtitle}</div>}
        </div>
    )
}
