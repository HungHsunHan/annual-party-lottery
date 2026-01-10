import { useEffect } from 'react'
import { useLotteryStore } from '../../stores/lottery-store'
import { StandbyScreen } from './StandbyScreen'
import { DrawAnimation } from './DrawAnimation'
import { WinnerReveal } from './WinnerReveal'
import { ConfirmDialog } from './ConfirmDialog'
import { soundManager } from '../../utils/sound-manager'
import './DisplayScreen.css'

export function DisplayScreen() {
    const {
        systemState,
        currentDraw,
        prizes,
        currentPrizeId,
        customAssets
    } = useLotteryStore()

    const currentPrize = currentPrizeId ? prizes.find(p => p.id === currentPrizeId) : null
    const nextPrize = prizes
        .filter(p => p.status !== 'completed')
        .sort((a, b) => a.order - b.order)[0]
    const displayPrize = currentPrize || nextPrize

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

        if (systemState === 'revealing') {
            soundManager.play('winner')
        }
    }, [systemState])

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
                    />
                )}

                {systemState === 'drawing' && currentPrize && (
                    <DrawAnimation
                        prize={currentPrize}
                    />
                )}

                {systemState === 'confirming' && (currentDraw?.pendingParticipants.length ?? 0) > 0 && currentPrize && (
                    <ConfirmDialog
                        participants={currentDraw.pendingParticipants}
                        prize={currentPrize}
                    />
                )}

                {systemState === 'revealing' && (currentDraw?.revealParticipants.length ?? 0) > 0 && currentPrize && (
                    <WinnerReveal
                        participants={currentDraw.revealParticipants}
                        prize={currentPrize}
                    />
                )}
            </div>

            {/* 底部資訊列 */}
            <div className="display-footer">
                <div className="footer-info">
                    {displayPrize && (
                        <span>
                            🎁 {displayPrize.name}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
