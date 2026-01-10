import { create } from 'zustand'
import {
    Participant,
    Prize,
    Winner,
    DrawMode,
    SystemState,
    CustomAssets,
    Statistics,
    LotteryState
} from '../types/lottery'

interface LotteryActions {
    // 參與者管理
    setParticipants: (participants: Participant[]) => void
    addParticipant: (participant: Omit<Participant, 'id' | 'hasWon'>) => void
    removeParticipant: (id: string) => void
    resetParticipantWinStatus: (id: string) => void

    // 獎項管理
    setPrizes: (prizes: Prize[]) => void
    addPrize: (prize: Omit<Prize, 'id' | 'drawnCount' | 'order' | 'status'>) => void
    updatePrize: (id: string, updates: Partial<Prize>) => void
    removePrize: (id: string) => void
    reorderPrizes: (prizes: Prize[]) => void
    incrementPrizeQuantity: (id: string) => void
    decrementPrizeQuantity: (id: string) => void

    // 抽獎流程
    setCurrentPrize: (prizeId: string | null) => void
    startDrawing: () => void
    setPendingParticipants: (participants: Participant[]) => void
    confirmWinners: (participantIds?: string[]) => void
    rejectAndRedraw: (participantId?: string) => void
    finishCurrentPrizeDraw: () => void

    // 中獎者管理
    removeWinner: (winnerId: string) => void

    // 設定
    setDrawMode: (mode: DrawMode) => void
    setCustomDrawCount: (count: number) => void
    setGlobalExcludeWinners: (exclude: boolean) => void

    // 系統狀態
    setSystemState: (state: SystemState) => void

    // 自訂資源
    setCustomAssets: (assets: Partial<CustomAssets>) => void

    // 狀態同步
    syncState: (state: Partial<LotteryState>) => void
    getFullState: () => LotteryState

    // 重置
    resetAll: () => void

    // 統計更新
    updateStatistics: () => void
}

const generateId = () => Math.random().toString(36).substring(2, 9)

const initialState: LotteryState = {
    participants: [],
    prizes: [],
    currentPrizeId: null,
    winners: [],
    currentDraw: null,
    drawMode: 'one',
    customDrawCount: 1,
    globalExcludeWinners: true,
    systemState: 'standby',
    customAssets: { sounds: {} },
    statistics: {
        totalParticipants: 0,
        remainingParticipants: 0,
        completedPrizes: 0,
        totalPrizes: 0
    }
}

export const useLotteryStore = create<LotteryState & LotteryActions>((set, get) => ({
    ...initialState,

    // 參與者管理
    setParticipants: (participants) => {
        set({ participants })
        get().updateStatistics()
    },

    addParticipant: (participant) => {
        const newParticipant: Participant = {
            ...participant,
            id: generateId(),
            hasWon: false
        }
        set((state) => ({ participants: [...state.participants, newParticipant] }))
        get().updateStatistics()
    },

    removeParticipant: (id) => {
        set((state) => ({
            participants: state.participants.filter(p => p.id !== id)
        }))
        get().updateStatistics()
    },

    resetParticipantWinStatus: (id) => {
        set((state) => ({
            participants: state.participants.map(p =>
                p.id === id ? { ...p, hasWon: false } : p
            )
        }))
        get().updateStatistics()
    },

    // 獎項管理
    setPrizes: (prizes) => {
        set({ prizes })
        get().updateStatistics()
    },

    addPrize: (prize) => {
        const state = get()
        const newPrize: Prize = {
            ...prize,
            id: generateId(),
            drawnCount: 0,
            order: state.prizes.length,
            status: 'pending'
        }
        set((state) => ({ prizes: [...state.prizes, newPrize] }))
        get().updateStatistics()
    },

    updatePrize: (id, updates) => {
        set((state) => ({
            prizes: state.prizes.map(p => {
                if (p.id !== id) return p
                const updated = { ...p, ...updates }
                // 自動更新狀態
                if (updated.drawnCount >= updated.quantity) {
                    updated.status = 'completed'
                } else if (updated.drawnCount > 0) {
                    updated.status = 'incomplete'
                }
                return updated
            })
        }))
        get().updateStatistics()
    },

    removePrize: (id) => {
        set((state) => ({
            prizes: state.prizes.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i }))
        }))
        get().updateStatistics()
    },

    reorderPrizes: (prizes) => {
        set({ prizes: prizes.map((p, i) => ({ ...p, order: i })) })
    },

    incrementPrizeQuantity: (id) => {
        set((state) => ({
            prizes: state.prizes.map(p => {
                if (p.id !== id) return p
                const updated = { ...p, quantity: p.quantity + 1 }
                // 如果之前是完成狀態，變回未完成
                if (p.status === 'completed') {
                    updated.status = 'incomplete'
                }
                return updated
            })
        }))
        get().updateStatistics()
    },

    decrementPrizeQuantity: (id) => {
        set((state) => ({
            prizes: state.prizes.map(p => {
                if (p.id !== id || p.quantity <= p.drawnCount) return p
                const updated = { ...p, quantity: p.quantity - 1 }
                if (updated.drawnCount >= updated.quantity) {
                    updated.status = 'completed'
                }
                return updated
            })
        }))
        get().updateStatistics()
    },

    // 抽獎流程
    setCurrentPrize: (prizeId) => {
        if (prizeId) {
            set((state) => ({
                currentPrizeId: prizeId,
                prizes: state.prizes.map(p => {
                    if (p.id === prizeId) {
                        if (p.status === 'completed' || p.drawnCount >= p.quantity) {
                            return { ...p, status: 'completed' }
                        }
                        return { ...p, status: 'in-progress' }
                    }
                    if (p.status === 'in-progress') {
                        if (p.drawnCount >= p.quantity) {
                            return { ...p, status: 'completed' }
                        }
                        if (p.drawnCount > 0) {
                            return { ...p, status: 'incomplete' }
                        }
                        return { ...p, status: 'pending' }
                    }
                    return p
                })
            }))
        } else {
            set({ currentPrizeId: null })
        }
    },

    startDrawing: () => {
        const state = get()
        if (!state.currentPrizeId) return

        const currentPrize = state.prizes.find(p => p.id === state.currentPrizeId)
        if (!currentPrize) return

        set({
            systemState: 'drawing',
            currentDraw: {
                prizeId: currentPrize.id,
                drawnParticipants: [],
                confirmedCount: 0,
                pendingParticipants: [],
                revealParticipants: []
            }
        })
    },

    setPendingParticipants: (participants) => {
        set((state) => ({
            systemState: 'confirming',
            currentDraw: state.currentDraw ? {
                ...state.currentDraw,
                pendingParticipants: participants,
                revealParticipants: []
            } : null
        }))
    },

    confirmWinners: (participantIds) => {
        const state = get()
        if (!state.currentDraw || !state.currentPrizeId) return

        const currentPrize = state.prizes.find(p => p.id === state.currentPrizeId)
        if (!currentPrize) return

        const pendingParticipants = state.currentDraw.pendingParticipants
        const confirmTargets = participantIds && participantIds.length > 0
            ? pendingParticipants.filter(p => participantIds.includes(p.id))
            : pendingParticipants
        if (confirmTargets.length === 0) return

        const newWinners: Winner[] = confirmTargets.map(participant => ({
            id: generateId(),
            participant,
            prize: currentPrize,
            drawnAt: new Date(),
            confirmed: true
        }))

        const newDrawnCount = currentPrize.drawnCount + confirmTargets.length
        const isCompleted = newDrawnCount >= currentPrize.quantity
        const remainingPending = pendingParticipants.filter(
            participant => !confirmTargets.some(target => target.id === participant.id)
        )
        const nextDrawnParticipants = [
            ...(state.currentDraw?.drawnParticipants ?? []),
            ...confirmTargets
        ]

        set((state) => ({
            winners: [...state.winners, ...newWinners],
            participants: state.participants.map(p =>
                confirmTargets.some(target => target.id === p.id) ? { ...p, hasWon: true } : p
            ),
            prizes: state.prizes.map(p =>
                p.id === state.currentPrizeId ? {
                    ...p,
                    drawnCount: newDrawnCount,
                    status: isCompleted ? 'completed' : 'incomplete'
                } : p
            ),
            systemState: remainingPending.length > 0 ? 'confirming' : 'revealing',
            currentDraw: state.currentDraw ? {
                ...state.currentDraw,
                drawnParticipants: nextDrawnParticipants,
                confirmedCount: state.currentDraw.confirmedCount + confirmTargets.length,
                pendingParticipants: remainingPending,
                revealParticipants: remainingPending.length > 0 ? [] : nextDrawnParticipants
            } : null
        }))

        get().updateStatistics()
    },

    rejectAndRedraw: (participantId) => {
        const state = get()
        if (!state.currentDraw) return

        if (!participantId) {
            // 放棄：回到抽獎池，立刻重抽
            set({
                systemState: 'drawing',
                currentDraw: state.currentDraw ? {
                    ...state.currentDraw,
                    pendingParticipants: [],
                    revealParticipants: []
                } : null
            })
            return
        }

        const remainingPending = state.currentDraw.pendingParticipants.filter(
            participant => participant.id !== participantId
        )
        set({
            systemState: 'confirming',
            currentDraw: state.currentDraw ? {
                ...state.currentDraw,
                pendingParticipants: remainingPending,
                revealParticipants: []
            } : null
        })
    },

    finishCurrentPrizeDraw: () => {
        set({
            systemState: 'standby',
            currentDraw: null
        })
    },

    // 中獎者管理
    removeWinner: (winnerId) => {
        const state = get()
        const winner = state.winners.find(w => w.id === winnerId)
        if (!winner) return
        const prize = state.prizes.find(p => p.id === winner.prize.id)
        const excludeWinners = prize?.excludeWinners ?? winner.prize.excludeWinners
        const remainingWins = state.winners.filter(
            w => w.id !== winnerId && w.participant.id === winner.participant.id
        ).length
        const shouldMarkWon = excludeWinners || remainingWins > 0

        set((state) => ({
            winners: state.winners.filter(w => w.id !== winnerId),
            participants: state.participants.map(p =>
                p.id === winner.participant.id ? { ...p, hasWon: shouldMarkWon } : p
            ),
            prizes: state.prizes.map(p => {
                if (p.id !== winner.prize.id) return p
                const newDrawnCount = p.drawnCount - 1
                return {
                    ...p,
                    drawnCount: newDrawnCount,
                    status: newDrawnCount >= p.quantity ? 'completed' :
                        newDrawnCount > 0 ? 'incomplete' : 'pending'
                }
            })
        }))
        get().updateStatistics()
    },

    // 設定
    setDrawMode: (mode) => set({ drawMode: mode }),
    setCustomDrawCount: (count) => set({ customDrawCount: count }),
    setGlobalExcludeWinners: (exclude) => set({ globalExcludeWinners: exclude }),

    // 系統狀態
    setSystemState: (state) => set({ systemState: state }),

    // 自訂資源
    setCustomAssets: (assets) => {
        set((state) => ({
            customAssets: {
                ...state.customAssets,
                ...assets,
                sounds: { ...state.customAssets.sounds, ...assets.sounds }
            }
        }))
    },

    // 狀態同步
    syncState: (newState) => {
        set((state) => ({ ...state, ...newState }))
    },

    getFullState: () => {
        const state = get()
        return {
            participants: state.participants,
            prizes: state.prizes,
            currentPrizeId: state.currentPrizeId,
            winners: state.winners,
            currentDraw: state.currentDraw,
            drawMode: state.drawMode,
            customDrawCount: state.customDrawCount,
            globalExcludeWinners: state.globalExcludeWinners,
            systemState: state.systemState,
            customAssets: state.customAssets,
            statistics: state.statistics
        }
    },

    // 重置
    resetAll: () => set(initialState),

    // 統計更新
    updateStatistics: () => {
        const state = get()
        const remainingParticipants = state.participants.filter(p => !p.hasWon).length
        const completedPrizes = state.prizes.filter(p => p.status === 'completed').length

        set({
            statistics: {
                totalParticipants: state.participants.length,
                remainingParticipants,
                completedPrizes,
                totalPrizes: state.prizes.length
            }
        })
    }
}))
