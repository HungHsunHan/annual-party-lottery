import { useState } from 'react'
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
        startDrawing,
        setPendingParticipants,
        confirmWinners,
        rejectAndRedraw,
        finishCurrentPrizeDraw,
        setSystemState
    } = useLotteryStore()

    const currentPrize = currentPrizeId ? prizes.find(p => p.id === currentPrizeId) : null
    const nextPrize = prizes
        .filter(p => p.status !== 'completed')
        .sort((a, b) => a.order - b.order)[0]

    const displayPrize = currentPrize || nextPrize
    const [isCollapsed, setIsCollapsed] = useState(false)
    const pendingParticipants = currentDraw?.pendingParticipants ?? []

    // 取得可抽獎的人員池
    const getEligibleParticipants = (): Participant[] => {
        if (!displayPrize) return []

        if (displayPrize.excludeWinners) {
            return participants.filter(p => !p.hasWon)
        }
        return participants
    }

    // 執行隨機抽獎
    const pickRandomParticipants = (count: number, excludeIds: Set<string> = new Set()) => {
        const eligible = getEligibleParticipants().filter(p => !excludeIds.has(p.id))
        if (eligible.length === 0 || count <= 0) return []

        const pool = [...eligible]
        for (let i = pool.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[pool[i], pool[j]] = [pool[j], pool[i]]
        }

        return pool.slice(0, Math.min(count, pool.length))
    }

    // 開始抽獎
    const handleStartDraw = () => {
        if (!displayPrize) return
        const remainingSlots = displayPrize.quantity - displayPrize.drawnCount
        if (remainingSlots <= 0) return

        if (!currentPrizeId) {
            setCurrentPrize(displayPrize.id)
        }

        startDrawing()
        onStateChange()

        // 模擬抽獎動畫結束後選出人
        // 實際的動畫在前台進行，這裡只是更新狀態
        setTimeout(() => {
            const drawCount = drawMode === 'all' ? remainingSlots : 1
            const winners = pickRandomParticipants(drawCount)
            if (winners.length > 0) {
                setPendingParticipants(winners)
                onStateChange()
                return
            }
            setSystemState('standby')
            onStateChange()
        }, 100) // 前台會處理動畫，這裡快速更新狀態
    }

    // 確認中獎
    const handleConfirm = (participantId?: string) => {
        confirmWinners(participantId ? [participantId] : undefined)
        onConfirm()

        // 檢查是否還要繼續抽
        const updatedState = useLotteryStore.getState()
        const updatedPrize = updatedState.prizes.find(p => p.id === updatedState.currentPrizeId)
        if (!updatedPrize) return

        if (drawMode === 'all') {
            onStateChange()
            return
        }

        if (updatedPrize.drawnCount >= updatedPrize.quantity) {
            // 獎項抽完了
            finishCurrentPrizeDraw()
            onStateChange()
        } else if (drawMode === 'custom' && updatedState.currentDraw && updatedState.currentDraw.confirmedCount < customDrawCount) {
            // 繼續抽
            setTimeout(handleStartDraw, 500)
        } else {
            // 逐一抽模式，等待下一次手動點擊
            setSystemState('standby')
            onStateChange()
        }
    }

    // 放棄重抽
    const handleReject = (participantId?: string) => {
        if (drawMode === 'all' && participantId) {
            const remainingPending = pendingParticipants.filter(p => p.id !== participantId)
            const excludeIds = new Set(remainingPending.map(p => p.id))
            const [replacement] = pickRandomParticipants(1, excludeIds)
            const nextPending = replacement ? [...remainingPending, replacement] : remainingPending
            setPendingParticipants(nextPending)
            onStateChange()
            return
        }

        rejectAndRedraw()
        onStateChange()

        // 立刻重新抽
        setTimeout(() => {
            const [winner] = pickRandomParticipants(1)
            if (winner) {
                setPendingParticipants([winner])
                onStateChange()
            }
        }, 100)
    }

    const handleContinue = () => {
        const updatedState = useLotteryStore.getState()
        const updatedPrize = updatedState.prizes.find(p => p.id === updatedState.currentPrizeId)
        if (updatedPrize && updatedPrize.drawnCount >= updatedPrize.quantity) {
            finishCurrentPrizeDraw()
        } else {
            setSystemState('standby')
        }
        onStateChange()
    }

    const eligibleCount = getEligibleParticipants().length
    const remainingSlots = displayPrize ? displayPrize.quantity - displayPrize.drawnCount : 0
    const canDraw = displayPrize &&
        remainingSlots > 0 &&
        eligibleCount > 0 &&
        systemState === 'standby'

    if (isFloating && !displayPrize) {
        return null
    }

    const containerClass = isFloating ? `draw-control-floating${isCollapsed ? ' collapsed' : ''}` : ''

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

                {systemState === 'confirming' && pendingParticipants.length > 0 && (
                    <div className="flex items-center gap-4" style={{ flex: 1, justifyContent: 'flex-end' }}>
                        <div className="confirm-list">
                            <div className="confirm-summary">
                                <span>抽中 {pendingParticipants.length} 人</span>
                                {pendingParticipants.length > 1 && (
                                    <button className="btn btn-success" onClick={() => handleConfirm()}>
                                        ✅ 全部確認
                                    </button>
                                )}
                            </div>
                            {pendingParticipants.map(participant => (
                                <div key={participant.id} className="confirm-list-item">
                                    <span className="confirm-list-name">
                                        {participant.department} - {participant.name}
                                    </span>
                                    <div className="confirm-list-actions">
                                        <button className="btn btn-success btn-sm" onClick={() => handleConfirm(participant.id)}>
                                            ✅ 確認
                                        </button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(participant.id)}>
                                            ❌ 重抽
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {systemState === 'revealing' && (
                    <div className="flex items-center gap-2">
                        <span>🎉 恭喜中獎！</span>
                        <button className="btn btn-secondary" onClick={handleContinue}>
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
            <div className="draw-control-header">
                <div className="draw-control-title">下一個獎項</div>
                <button
                    className="draw-control-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    type="button"
                >
                    {isCollapsed ? '展開' : '收合'}
                </button>
            </div>

            {isCollapsed && displayPrize && (
                <div className="draw-control-collapsed-prize">
                    🎁 {displayPrize.name}
                </div>
            )}

            {!isCollapsed && (
                <>
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
                </>
            )}
        </div>
    )
}
