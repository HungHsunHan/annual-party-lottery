import { useEffect, useState } from 'react'
import { useLotteryStore } from '../../stores/lottery-store'
import { Participant } from '../../types/lottery'
import { REVEAL_COUNTDOWN_MS } from '../../constants/lottery'

interface DrawControlProps {
    onStateChange: () => void
    onConfirm: () => void
}

type Decision = 'confirm' | 'redraw'

export function DrawControl({ onStateChange, onConfirm }: DrawControlProps) {
    const [isRevealCountdownDone, setIsRevealCountdownDone] = useState(false)
    const [decisionMap, setDecisionMap] = useState<Record<string, Decision>>({})
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
        finishCurrentPrizeDraw,
        setCurrentPrize,
        setSystemState,
        displaySettings
    } = useLotteryStore()

    const currentPrize = currentPrizeId ? prizes.find(p => p.id === currentPrizeId) : null
    const nextPrize = prizes
        .filter(p => p.status !== 'completed')
        .sort((a, b) => a.order - b.order)[0]

    const displayPrize = currentPrize || nextPrize
    const pendingParticipants = currentDraw?.pendingParticipants ?? []
    const revealSignature = currentDraw?.revealParticipants.map(participant => participant.id).join(',') ?? ''
    const pendingSignature = pendingParticipants.map(participant => participant.id).join(',') ?? ''
    const isRevealPhase = systemState === 'revealing' || systemState === 'confirming'
    const flashDurationMs = Math.max(0, displaySettings.countdown.flashDurationSeconds ?? 0) * 1000
    const flashNameDurationMs = Math.max(0, displaySettings.countdown.flashNameDurationMs ?? 0)

    // 取得可抽獎的人員池
    const getEligibleParticipants = (): Participant[] => {
        if (!displayPrize) return []

        if (displayPrize.excludeWinners) {
            return participants.filter(p => !p.hasWon)
        }
        return participants
    }

    const eligibleParticipants = getEligibleParticipants()
    const flashDelayMs = flashDurationMs > 0 && flashNameDurationMs > 0 && eligibleParticipants.length > 0
        ? flashDurationMs
        : 0
    const revealDelayMs = REVEAL_COUNTDOWN_MS + flashDelayMs
    const decisionCounts = pendingParticipants.reduce(
        (acc, participant) => {
            const decision = decisionMap[participant.id] ?? 'confirm'
            if (decision === 'redraw') {
                acc.redraw += 1
            } else {
                acc.confirm += 1
            }
            return acc
        },
        { confirm: 0, redraw: 0 }
    )

    useEffect(() => {
        if (!isRevealPhase || !revealSignature) {
            setIsRevealCountdownDone(false)
            return
        }

        setIsRevealCountdownDone(false)
        const timeout = setTimeout(() => {
            setIsRevealCountdownDone(true)
        }, revealDelayMs)

        return () => {
            clearTimeout(timeout)
        }
    }, [isRevealPhase, revealSignature, revealDelayMs])

    useEffect(() => {
        if (!pendingSignature) {
            setDecisionMap({})
            return
        }

        setDecisionMap((prev) => {
            const next: Record<string, Decision> = {}
            pendingParticipants.forEach(participant => {
                next[participant.id] = prev[participant.id] ?? 'confirm'
            })
            return next
        })
    }, [pendingSignature, pendingParticipants])

    const pickRandomParticipantsFromState = (count: number, excludeIds: Set<string> = new Set()) => {
        const state = useLotteryStore.getState()
        const activePrize = state.currentPrizeId
            ? state.prizes.find(prize => prize.id === state.currentPrizeId)
            : null

        if (!activePrize || count <= 0) return []

        const eligible = activePrize.excludeWinners
            ? state.participants.filter(participant => !participant.hasWon)
            : state.participants
        const filtered = eligible.filter(participant => !excludeIds.has(participant.id))
        if (filtered.length === 0) return []

        const pool = [...filtered]
        for (let i = pool.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[pool[i], pool[j]] = [pool[j], pool[i]]
        }

        return pool.slice(0, Math.min(count, pool.length))
    }

    const triggerDraw = (count: number) => {
        if (count <= 0) return

        setSystemState('drawing')
        onStateChange()

        setTimeout(() => {
            const winners = pickRandomParticipantsFromState(count)
            if (winners.length > 0) {
                setPendingParticipants(winners)
                onStateChange()
                return
            }

            setSystemState('standby')
            onStateChange()
        }, 100)
    }

    const advanceToNextPrize = () => {
        const state = useLotteryStore.getState()
        const nextPrize = state.prizes
            .filter(prize => prize.status !== 'completed' && prize.drawnCount < prize.quantity)
            .sort((a, b) => a.order - b.order)[0]

        if (nextPrize) {
            setCurrentPrize(nextPrize.id)
        }
    }

    const finishPrizeAndAdvance = () => {
        finishCurrentPrizeDraw()
        advanceToNextPrize()
        onStateChange()
    }

    const proceedAfterConfirm = () => {
        const updatedState = useLotteryStore.getState()
        const updatedPrize = updatedState.prizes.find(p => p.id === updatedState.currentPrizeId)
        if (!updatedPrize) return

        if (drawMode === 'all') {
            onStateChange()
            return
        }

        if (updatedPrize.drawnCount >= updatedPrize.quantity) {
            finishPrizeAndAdvance()
            return
        }

        if (drawMode === 'custom' &&
            updatedState.currentDraw &&
            updatedState.currentDraw.confirmedCount < customDrawCount) {
            triggerDraw(1)
            return
        }

        setSystemState('standby')
        onStateChange()
    }

    const setAllDecisions = (decision: Decision) => {
        const next: Record<string, Decision> = {}
        pendingParticipants.forEach(participant => {
            next[participant.id] = decision
        })
        setDecisionMap(next)
    }

    const setDecision = (participantId: string, decision: Decision) => {
        setDecisionMap((prev) => ({ ...prev, [participantId]: decision }))
    }

    const handleApplyDecisions = () => {
        if (pendingParticipants.length === 0) return

        const confirmIds: string[] = []
        const redrawIds: string[] = []

        pendingParticipants.forEach(participant => {
            const decision = decisionMap[participant.id] ?? 'confirm'
            if (decision === 'redraw') {
                redrawIds.push(participant.id)
            } else {
                confirmIds.push(participant.id)
            }
        })

        if (confirmIds.length > 0) {
            confirmWinners(confirmIds)
            onConfirm()
        }

        if (redrawIds.length > 0) {
            triggerDraw(redrawIds.length)
            return
        }

        proceedAfterConfirm()
    }

    const handleContinue = () => {
        const updatedState = useLotteryStore.getState()
        const updatedPrize = updatedState.prizes.find(p => p.id === updatedState.currentPrizeId)
        if (updatedPrize && updatedPrize.drawnCount >= updatedPrize.quantity) {
            finishPrizeAndAdvance()
            return
        }
        setSystemState('standby')
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
                            <div className="confirm-summary-info">
                                <span>抽中 {pendingParticipants.length} 人</span>
                                <span className="confirm-summary-count is-confirm">
                                    獲獎 {decisionCounts.confirm}
                                </span>
                                <span className="confirm-summary-count is-redraw">
                                    重抽 {decisionCounts.redraw}
                                </span>
                            </div>
                            <div className="confirm-summary-actions">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setAllDecisions('confirm')}
                                >
                                    ✅ 全部獲獎
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setAllDecisions('redraw')}
                                >
                                    ❌ 全部重抽
                                </button>
                                <button className="btn btn-success" onClick={handleApplyDecisions}>
                                    ✅ 確定
                                </button>
                            </div>
                        </div>
                        {pendingParticipants.map(participant => (
                            <div key={participant.id} className="confirm-list-item">
                                <span className="confirm-list-name">
                                    {participant.department} - {participant.name}
                                </span>
                                <div className="confirm-list-actions">
                                    <button
                                        className={`btn btn-success btn-sm confirm-decision-btn ${decisionMap[participant.id] !== 'redraw' ? 'is-selected' : ''}`}
                                        onClick={() => setDecision(participant.id, 'confirm')}
                                    >
                                        ✅ 獲獎
                                    </button>
                                    <button
                                        className={`btn btn-danger btn-sm confirm-decision-btn ${decisionMap[participant.id] === 'redraw' ? 'is-selected' : ''}`}
                                        onClick={() => setDecision(participant.id, 'redraw')}
                                    >
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
