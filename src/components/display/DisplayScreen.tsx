import { useEffect, useState } from 'react'
import { useLotteryStore } from '../../stores/lottery-store'
import { StandbyScreen } from './StandbyScreen'
import { WinnerReveal } from './WinnerReveal'
import { RevealCountdown } from './RevealCountdown'
import { soundManager } from '../../utils/sound-manager'
import { REVEAL_COUNTDOWN_SECONDS, REVEAL_COUNTDOWN_MS } from '../../constants/lottery'
import './DisplayScreen.css'

export function DisplayScreen() {
    const {
        systemState,
        currentDraw,
        prizes,
        currentPrizeId,
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
    const revealParticipantIds = currentDraw?.revealParticipants.map(participant => participant.id).join(',') ?? ''
    const hasRevealParticipants = (currentDraw?.revealParticipants.length ?? 0) > 0

    useEffect(() => {
        const shouldCountdown = systemState === 'drawing' || (systemState === 'revealing' && hasRevealParticipants)
        if (!shouldCountdown) {
            setIsRevealReady(false)
            setRevealSeconds(REVEAL_COUNTDOWN_SECONDS)
            return
        }

        setIsRevealReady(false)
        setRevealSeconds(REVEAL_COUNTDOWN_SECONDS)
        let secondsRemaining = REVEAL_COUNTDOWN_SECONDS
        const interval = setInterval(() => {
            secondsRemaining = Math.max(1, secondsRemaining - 1)
            setRevealSeconds(secondsRemaining)
        }, 1000)
        const timeout = setTimeout(() => {
            setIsRevealReady(true)
            clearInterval(interval)
        }, REVEAL_COUNTDOWN_MS)

        return () => {
            clearInterval(interval)
            clearTimeout(timeout)
        }
    }, [systemState, currentDraw?.prizeId, revealParticipantIds, hasRevealParticipants])

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
    const backgroundStyle = customAssets.background
        ? {
            backgroundImage: `url(data:image/png;base64,${customAssets.background})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }
        : {}

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
                    <RevealCountdown
                        seconds={revealSeconds}
                        prize={currentPrize}
                        drawMode={drawMode}
                        logo={customAssets.logo}
                        settings={displaySettings.countdown}
                    />
                )}

                {systemState === 'revealing' && hasRevealParticipants && currentPrize && (
                    isRevealReady ? (
                        <WinnerReveal
                            participants={currentDraw.revealParticipants}
                            prize={currentPrize}
                            drawMode={drawMode}
                            logo={customAssets.logo}
                            settings={displaySettings.winner}
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
            </div>
        </div>
    )
}
