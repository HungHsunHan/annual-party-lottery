import { useLotteryStore } from '../../stores/lottery-store'
import { Participant } from '../../types/lottery'

interface DrawControlProps {
    onStateChange: () => void
    onConfirm: () => void
    isFloating?: boolean
}

export function DrawControl({ onStateChange, onConfirm, isFloating }: DrawControlProps) {
    const {
        prizes,
        participants,
        currentPrizeId,
        systemState,
        drawMode,
        customDrawCount,
        currentDraw,
        setCurrentPrize,
        setDrawMode,
        setCustomDrawCount,
        startDrawing,
        setDrawnParticipant,
        confirmWinner,
        rejectAndRedraw,
        finishCurrentPrizeDraw,
        setSystemState
    } = useLotteryStore()

    const currentPrize = currentPrizeId ? prizes.find(p => p.id === currentPrizeId) : null
    const nextPrize = prizes
        .filter(p => p.status !== 'completed')
        .sort((a, b) => a.order - b.order)[0]

    const displayPrize = currentPrize || nextPrize

    // 取得可抽獎的人員池
    const getEligibleParticipants = (): Participant[] => {
        if (!displayPrize) return []

        if (displayPrize.excludeWinners) {
            return participants.filter(p => !p.hasWon)
        }
        return participants
    }

    // 執行隨機抽獎
    const performDraw = () => {
        const eligible = getEligibleParticipants()
        if (eligible.length === 0) return null

        const randomIndex = Math.floor(Math.random() * eligible.length)
        return eligible[randomIndex]
    }

    // 開始抽獎
    const handleStartDraw = () => {
        if (!displayPrize) return

        if (!currentPrizeId) {
            setCurrentPrize(displayPrize.id)
        }

        startDrawing()
        onStateChange()

        // 模擬抽獎動畫結束後選出人
        // 實際的動畫在前台進行，這裡只是更新狀態
        setTimeout(() => {
            const winner = performDraw()
            if (winner) {
                setDrawnParticipant(winner)
                onStateChange()
            }
        }, 100) // 前台會處理動畫，這裡快速更新狀態
    }

    // 確認中獎
    const handleConfirm = () => {
        confirmWinner()
        onConfirm()

        // 檢查是否還要繼續抽
        const updatedPrize = useLotteryStore.getState().prizes.find(p => p.id === currentPrizeId)
        if (updatedPrize && updatedPrize.drawnCount >= updatedPrize.quantity) {
            // 獎項抽完了
            finishCurrentPrizeDraw()
            onStateChange()
        } else if (drawMode === 'all' || (drawMode === 'custom' && currentDraw && currentDraw.confirmedCount < customDrawCount)) {
            // 繼續抽
            setTimeout(handleStartDraw, 500)
        } else {
            // 逐一抽模式，等待下一次手動點擊
            setSystemState('standby')
            onStateChange()
        }
    }

    // 放棄重抽
    const handleReject = () => {
        rejectAndRedraw()
        onStateChange()

        // 立刻重新抽
        setTimeout(() => {
            const winner = performDraw()
            if (winner) {
                setDrawnParticipant(winner)
                onStateChange()
            }
        }, 100)
    }

    const eligibleCount = getEligibleParticipants().length
    const canDraw = displayPrize &&
        displayPrize.status !== 'completed' &&
        eligibleCount > 0 &&
        systemState === 'standby'

    if (isFloating && !displayPrize) {
        return null
    }

    const containerClass = isFloating ? 'draw-control-floating' : ''

    // 抽獎進行中的控制（顯示在頂部條）
    if (!isFloating && systemState !== 'standby') {
        return (
            <div className="flex items-center justify-between" style={{ color: 'white' }}>
                <div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>正在抽獎</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        {displayPrize?.name}
                        <span style={{ opacity: 0.8, marginLeft: '0.5rem' }}>
                            ({displayPrize?.drawnCount}/{displayPrize?.quantity})
                        </span>
                    </div>
                </div>

                {systemState === 'drawing' && (
                    <div className="flex items-center gap-2">
                        <span className="animate-pulse">🎲 抽獎中...</span>
                    </div>
                )}

                {systemState === 'confirming' && currentDraw?.pendingParticipant && (
                    <div className="flex items-center gap-4">
                        <div>
                            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>抽中</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                                {currentDraw.pendingParticipant.department} - {currentDraw.pendingParticipant.name}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="btn btn-success" onClick={handleConfirm}>
                                ✅ 確認領取
                            </button>
                            <button className="btn btn-danger" onClick={handleReject}>
                                ❌ 放棄重抽
                            </button>
                        </div>
                    </div>
                )}

                {systemState === 'revealing' && (
                    <div className="flex items-center gap-2">
                        <span>🎉 恭喜中獎！</span>
                        <button className="btn btn-secondary" onClick={() => {
                            setSystemState('standby')
                            onStateChange()
                        }}>
                            繼續
                        </button>
                    </div>
                )}
            </div>
        )
    }

    // 待機狀態的浮動控制面板
    return (
        <div className={containerClass}>
            <div className="draw-control-title">下一個獎項</div>
            <div className="draw-control-prize">
                {displayPrize ? (
                    <>
                        🎁 {displayPrize.name}
                        <span style={{ opacity: 0.7, fontSize: '1rem', marginLeft: '0.5rem' }}>
                            ({displayPrize.drawnCount}/{displayPrize.quantity})
                        </span>
                    </>
                ) : (
                    '請新增獎項'
                )}
            </div>

            {displayPrize && (
                <>
                    <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', opacity: 0.8 }}>
                        可抽人數：{eligibleCount} 人
                        {!displayPrize.excludeWinners && <span style={{ color: '#fbbf24' }}> (含已中獎)</span>}
                    </div>

                    <div className="draw-mode-select">
                        <button
                            className={`draw-mode-btn ${drawMode === 'one' ? 'active' : ''}`}
                            onClick={() => setDrawMode('one')}
                        >
                            逐一抽
                        </button>
                        <button
                            className={`draw-mode-btn ${drawMode === 'all' ? 'active' : ''}`}
                            onClick={() => setDrawMode('all')}
                        >
                            全部抽
                        </button>
                    </div>

                    <button
                        className="start-draw-btn"
                        onClick={handleStartDraw}
                        disabled={!canDraw}
                    >
                        🎲 開始抽獎
                    </button>
                </>
            )}
        </div>
    )
}
