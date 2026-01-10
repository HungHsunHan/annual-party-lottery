import { useEffect, useState } from 'react'
import { useLotteryStore } from '../../stores/lottery-store'
import { Participant } from '../../types/lottery'
import { REVEAL_COUNTDOWN_MS } from '../../constants/lottery'

interface DrawControlProps {
    onStateChange: () => void
    onConfirm: () => void
}

export function DrawControl({ onStateChange, onConfirm }: DrawControlProps) {
    const [isRevealCountdownDone, setIsRevealCountdownDone] = useState(false)
    const {
        prizes,
        participants,
        currentPrizeId,
        systemState,
        drawMode,
        customDrawCount,
        currentDraw,
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
    const pendingParticipants = currentDraw?.pendingParticipants ?? []
    const revealSignature = currentDraw?.revealParticipants.map(participant => participant.id).join(',') ?? ''
    const isRevealPhase = systemState === 'revealing' || systemState === 'confirming'

    useEffect(() => {
        if (!isRevealPhase || !revealSignature) {
            setIsRevealCountdownDone(false)
            return
        }

        setIsRevealCountdownDone(false)
        const timeout = setTimeout(() => {
            setIsRevealCountdownDone(true)
        }, REVEAL_COUNTDOWN_MS)

        return () => {
            clearTimeout(timeout)
        }
    }, [isRevealPhase, revealSignature])

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

    if (systemState === 'standby' || !displayPrize) {
        return null
    }

    // 抽獎進行中的控制（顯示在頂部條）
    return (
        <div className="flex items-center justify-between" style={{ color: 'white' }}>
            <div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>正在抽獎</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {displayPrize.name}
                    <span style={{ opacity: 0.8, marginLeft: '0.5rem' }}>
                        ({displayPrize.drawnCount}/{displayPrize.quantity})
                    </span>
                </div>
            </div>

            {systemState === 'drawing' && (
                <div className="flex items-center gap-2">
                    <span className="animate-pulse">🎲 抽獎中...</span>
                </div>
            )}

            {isRevealPhase && pendingParticipants.length > 0 && !isRevealCountdownDone && (
                <div className="flex items-center gap-2">
                    <span>⏳ 倒數揭曉中...</span>
                </div>
            )}

            {isRevealPhase && pendingParticipants.length > 0 && isRevealCountdownDone && (
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

            {isRevealPhase && pendingParticipants.length === 0 && (
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
