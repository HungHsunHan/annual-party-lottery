import { useEffect, useState } from 'react'
import { useLotteryStore } from '../../stores/lottery-store'
import { StandbyScreen } from './StandbyScreen'
import { WinnerReveal } from './WinnerReveal'
import { RevealCountdown } from './RevealCountdown'
import { FlashNameSequence } from './FlashNameSequence'
import { soundManager } from '../../utils/sound-manager'
import { REVEAL_COUNTDOWN_SECONDS, REVEAL_COUNTDOWN_MS } from '../../constants/lottery'
import { DEFAULT_BACKGROUND_URL } from '../../constants/default-assets'
import './DisplayScreen.css'

export function DisplayScreen() {
    const {
        systemState,
        currentDraw,
        prizes,
        currentPrizeId,
        participants,
        customAssets,
        displaySettings,
        drawMode
    } = useLotteryStore()

    const currentPrize = currentPrizeId ? prizes.find(p => p.id === currentPrizeId) : null
    const nextPrize = prizes
        .filter(p => p.status !== 'completed')
        .sort((a, b) => a.order - b.order)[0]
    const activePrize = currentPrize && currentPrize.status !== 'completed' ? currentPrize : null
    const displayPrize = activePrize || nextPrize || (systemState !== 'standby' ? currentPrize : null)
    const [revealSeconds, setRevealSeconds] = useState(REVEAL_COUNTDOWN_SECONDS)
    const [isRevealReady, setIsRevealReady] = useState(false)
    const [isFlashing, setIsFlashing] = useState(false)
    const revealParticipants = currentDraw?.revealParticipants ?? []
    const revealParticipantIds = revealParticipants.map(participant => participant.id).join(',')
    const hasRevealParticipants = revealParticipants.length > 0
    const flashDurationSeconds = Math.max(0, displaySettings.countdown.flashDurationSeconds ?? 0)
    const flashNameDurationMs = Math.max(0, displaySettings.countdown.flashNameDurationMs ?? 0)
    const flashDurationMs = flashDurationSeconds * 1000
    const flashEligibleCount = currentPrize
        ? (currentPrize.excludeWinners
            ? participants.filter(participant => !participant.hasWon).length
            : participants.length)
        : 0
    const shouldFlash = flashDurationMs > 0 && flashNameDurationMs > 0 && flashEligibleCount > 0

    useEffect(() => {
        const shouldRunSequence = systemState === 'drawing' || (systemState === 'revealing' && hasRevealParticipants)
        if (!shouldRunSequence) {
            setIsRevealReady(false)
            setRevealSeconds(REVEAL_COUNTDOWN_SECONDS)
            setIsFlashing(false)
            soundManager.stop('countdown')
            return
        }

        setIsRevealReady(false)
        setRevealSeconds(REVEAL_COUNTDOWN_SECONDS)
        let countdownInterval: ReturnType<typeof setInterval> | null = null
        let countdownTimeout: ReturnType<typeof setTimeout> | null = null
        let flashTimeout: ReturnType<typeof setTimeout> | null = null

        const startCountdown = () => {
            setIsFlashing(false)
            soundManager.stop('countdown')
            soundManager.play('countdown')
            let secondsRemaining = REVEAL_COUNTDOWN_SECONDS
            setRevealSeconds(secondsRemaining)
            countdownInterval = setInterval(() => {
                secondsRemaining = Math.max(1, secondsRemaining - 1)
                setRevealSeconds(secondsRemaining)
            }, 1000)
            countdownTimeout = setTimeout(() => {
                setIsRevealReady(true)
                soundManager.stop('countdown')
                if (countdownInterval) {
                    clearInterval(countdownInterval)
                }
            }, REVEAL_COUNTDOWN_MS)
        }

        if (shouldFlash) {
            setIsFlashing(true)
            flashTimeout = setTimeout(startCountdown, flashDurationMs)
        } else {
            setIsFlashing(false)
            startCountdown()
        }

        return () => {
            soundManager.stop('countdown')
            if (countdownInterval) {
                clearInterval(countdownInterval)
            }
            if (countdownTimeout) {
                clearTimeout(countdownTimeout)
            }
            if (flashTimeout) {
                clearTimeout(flashTimeout)
            }
        }
    }, [
        systemState,
        currentDraw?.prizeId,
        revealParticipantIds,
        hasRevealParticipants,
        shouldFlash,
        flashDurationMs
    ])

    // 載入自訂音效
    useEffect(() => {
        if (customAssets.sounds?.rolling) {
            soundManager.setCustomSound('rolling', customAssets.sounds.rolling)
        } else if (soundManager.hasCustomSound('rolling')) {
            soundManager.clearCustomSound('rolling')
        }
        if (customAssets.sounds?.winner) {
            soundManager.setCustomSound('winner', customAssets.sounds.winner)
        } else if (soundManager.hasCustomSound('winner')) {
            soundManager.clearCustomSound('winner')
        }
        if (customAssets.sounds?.countdown) {
            soundManager.setCustomSound('countdown', customAssets.sounds.countdown)
        } else if (soundManager.hasCustomSound('countdown')) {
            soundManager.clearCustomSound('countdown')
        }
    }, [customAssets.sounds?.rolling, customAssets.sounds?.winner, customAssets.sounds?.countdown])

    // 根據狀態播放/停止音效
    useEffect(() => {
        if (systemState === 'drawing') {
            soundManager.play('rolling')
        } else {
            soundManager.stop('rolling')
        }
    }, [systemState])

    useEffect(() => {
        if (systemState === 'revealing' && isRevealReady) {
            soundManager.play('winner')
        }
    }, [systemState, isRevealReady])

    // 背景樣式
    const backgroundUrl = customAssets.background
        ? `data:image/png;base64,${customAssets.background}`
        : DEFAULT_BACKGROUND_URL
    const backgroundStyle = {
        backgroundImage: `url(${backgroundUrl})`, // Display background image
        backgroundSize: 'cover', // Fill the screen; adjust for crop vs. fit
        backgroundPosition: 'center' // Center focal point
    }

    return (
        <div className="display-screen" style={backgroundStyle}>
            {/* 背景裝飾 */}
            <div className="background-overlay" />
            <div className="background-particles" />

            {/* 主要內容 */}
            <div className="display-content">
                {systemState === 'standby' && (
                    <StandbyScreen
                        logo={customAssets.logo}
                        prizes={prizes}
                        currentPrize={displayPrize}
                        drawMode={drawMode}
                        displaySettings={displaySettings}
                    />
                )}

                {systemState === 'drawing' && currentPrize && (
                    isFlashing ? (
                        <FlashNameSequence
                            prize={currentPrize}
                            drawMode={drawMode}
                            logo={customAssets.logo}
                            settings={displaySettings.countdown}
                            nameDurationMs={flashNameDurationMs}
                        />
                    ) : (
                        <RevealCountdown
                            seconds={revealSeconds}
                            prize={currentPrize}
                            drawMode={drawMode}
                            logo={customAssets.logo}
                            settings={displaySettings.countdown}
                        />
                    )
                )}

                {systemState === 'revealing' && hasRevealParticipants && currentPrize && (
                    isRevealReady ? (
                        <WinnerReveal
                            participants={revealParticipants}
                            prize={currentPrize}
                            drawMode={drawMode}
                            logo={customAssets.logo}
                            settings={displaySettings.winner}
                        />
                    ) : (
                        isFlashing ? (
                            <FlashNameSequence
                                prize={currentPrize}
                                drawMode={drawMode}
                                logo={customAssets.logo}
                                settings={displaySettings.countdown}
                                nameDurationMs={flashNameDurationMs}
                            />
                        ) : (
                            <RevealCountdown
                                seconds={revealSeconds}
                                prize={currentPrize}
                                drawMode={drawMode}
                                logo={customAssets.logo}
                                settings={displaySettings.countdown}
                            />
                        )
                    )
                )}
            </div>
        </div>
    )
}
