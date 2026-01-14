import { useEffect, useMemo, useState } from 'react'
import { DisplaySettings, DrawMode, Participant, Prize } from '../../types/lottery'
import { useLotteryStore } from '../../stores/lottery-store'

interface FlashNameSequenceProps {
    prize: Prize
    drawMode: DrawMode
    logo?: string
    settings: DisplaySettings['countdown']
    nameDurationMs: number
}

export function FlashNameSequence({
    prize,
    drawMode,
    logo,
    settings,
    nameDurationMs
}: FlashNameSequenceProps) {
    const { participants } = useLotteryStore()
    const [displayParticipant, setDisplayParticipant] = useState<Participant | null>(null)
    const [flashKey, setFlashKey] = useState(0)

    const eligibleParticipants = useMemo(() => {
        if (prize.excludeWinners) {
            return participants.filter(participant => !participant.hasWon)
        }
        return participants
    }, [participants, prize.excludeWinners])

    useEffect(() => {
        if (eligibleParticipants.length === 0 || nameDurationMs <= 0) {
            setDisplayParticipant(null)
            return
        }

        const pickName = () => {
            const index = Math.floor(Math.random() * eligibleParticipants.length)
            setDisplayParticipant(eligibleParticipants[index] ?? null)
            setFlashKey((prev) => prev + 1)
        }

        pickName()
        const interval = setInterval(pickName, nameDurationMs)

        return () => {
            clearInterval(interval)
        }
    }, [eligibleParticipants, nameDurationMs])

    const showLogo = settings.showLogo && Boolean(logo)
    const showProgress = drawMode === 'one' && settings.showPrizeProgress
    const showPrizeName = settings.showPrizeName
    const showPrizeBlock = showPrizeName || showProgress

    return (
        <div className="flash-reveal">
            <div className="countdown-grid" />
            {showLogo && (
                <img
                    src={`data:image/png;base64,${logo}`}
                    alt="Company Logo"
                    className="display-logo countdown-logo"
                />
            )}
            <div className="flash-name-card">
                <div key={flashKey} className="flash-name-stack">
                    <div className="flash-name">{displayParticipant?.name || '...'}</div>
                    <div className="flash-dept">{displayParticipant?.department ?? ''}</div>
                </div>
            </div>
            {showPrizeBlock && (
                <div className="countdown-prize">
                    {showPrizeName && (
                        <span className="countdown-prize-name">{prize.name}</span>
                    )}
                    {showProgress && (
                        <span className="prize-progress">{prize.drawnCount}/{prize.quantity}</span>
                    )}
                </div>
            )}
        </div>
    )
}
