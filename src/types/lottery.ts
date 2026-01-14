// 參與者類型
export interface Participant {
    id: string
    name: string
    department: string
    title: string
    hasWon: boolean
}

// 獎項類型
export interface Prize {
    id: string
    name: string
    quantity: number
    drawnCount: number
    order: number
    excludeWinners: boolean  // 個別設定是否排除已中獎者
    status: 'pending' | 'in-progress' | 'incomplete' | 'completed'
}

// 中獎者類型
export interface Winner {
    id: string
    participant: Participant
    prize: Prize
    drawnAt: Date
    confirmed: boolean
}

// 抽獎模式
export type DrawMode = 'all' | 'one' | 'custom'

// 系統狀態
export type SystemState = 'standby' | 'drawing' | 'revealing' | 'confirming'

// 自訂資源
export interface CustomAssets {
    logo?: string  // base64
    background?: string  // base64
    sounds: {
        rolling?: string  // base64
        winner?: string
        countdown?: string
    }
}

export interface DisplaySettings {
    standby: {
        title: string
        subtitle: string
        showLogo: boolean
        showPrizePreview: boolean
        showPrizeProgress: boolean
    }
    countdown: {
        showLogo: boolean
        label: string
        subtitle: string
        showPrizeName: boolean
        showPrizeProgress: boolean
        flashDurationSeconds: number
        flashNameDurationMs: number
    }
    winner: {
        showLogo: boolean
        badgeText: string
        showPrizeName: boolean
        showPrizeProgress: boolean
        showConfetti: boolean
        showDepartment: boolean
        showTrophy: boolean
        trophyEmoji: string
    }
}

// 統計資料
export interface Statistics {
    totalParticipants: number
    remainingParticipants: number
    completedPrizes: number
    totalPrizes: number
}

// 全域狀態
export interface LotteryState {
    // 參與者
    participants: Participant[]

    // 獎項
    prizes: Prize[]
    currentPrizeId: string | null

    // 中獎者
    winners: Winner[]

    // 當前抽獎
    currentDraw: {
        prizeId: string
        drawnParticipants: Participant[]
        confirmedCount: number
        pendingParticipants: Participant[]
        revealParticipants: Participant[]
    } | null

    // 抽獎設定
    drawMode: DrawMode
    customDrawCount: number
    globalExcludeWinners: boolean

    // 系統狀態
    systemState: SystemState

    // 自訂資源
    customAssets: CustomAssets

    // 畫面設定
    displaySettings: DisplaySettings

    // 統計
    statistics: Statistics
}
