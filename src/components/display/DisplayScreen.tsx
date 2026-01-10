import { useEffect, useState } from 'react'
import { useLotteryStore } from '../../stores/lottery-store'
import { StandbyScreen } from './StandbyScreen'
import { DrawAnimation } from './DrawAnimation'
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

    useEffect(() => {
        if (systemState !== 'revealing' || !(currentDraw?.revealParticipants.length ?? 0)) {
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
    }, [systemState, currentDraw?.prizeId, revealParticipantIds])

    // 載入自訂音效
    useEffect(() => {
        if (customAssets.sounds?.rolling) {
            soundManager.setCustomSound('rolling', customAssets.sounds.rolling)
        }
        if (customAssets.sounds?.winner) {
            soundManager.setCustomSound('winner', customAssets.sounds.winner)
        }
    }, [customAssets.sounds])

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
                    />
                )}

                {systemState === 'drawing' && currentPrize && (
                    <DrawAnimation
                        prize={currentPrize}
                        drawMode={drawMode}
                    />
                )}

                {systemState === 'revealing' && (currentDraw?.revealParticipants.length ?? 0) > 0 && currentPrize && (
                    isRevealReady ? (
                        <WinnerReveal
                            participants={currentDraw.revealParticipants}
                            prize={currentPrize}
                            drawMode={drawMode}
                        />
                    ) : (
                        <RevealCountdown
                            seconds={revealSeconds}
                            prize={currentPrize}
                            drawMode={drawMode}
                        />
                    )
                )}
            </div>

            {/* 底部資訊列 */}
            {displayPrize && (
                <div className="display-footer">
                    <div className="footer-info">
                        <span className="footer-prize-name">🎁 {displayPrize.name}</span>
                        {drawMode === 'one' && (
                            <span className="prize-progress footer-prize-progress">
                                {displayPrize.drawnCount}/{displayPrize.quantity}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
