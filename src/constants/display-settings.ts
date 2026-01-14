import { CustomAssets, DisplaySettings } from '../types/lottery'

export const createDefaultCustomAssets = (): CustomAssets => ({
    sounds: {}
})

export const createDefaultDisplaySettings = (): DisplaySettings => ({
    standby: {
        title: '年终尾牙抽奖',
        subtitle: '',
        showLogo: true,
        showPrizePreview: true,
        showPrizeProgress: true
    },
    countdown: {
        showLogo: false,
        label: '',
        subtitle: '',
        showPrizeName: true,
        showPrizeProgress: true,
        flashDurationSeconds: 3,
        flashNameDurationMs: 500
    },
    winner: {
        showLogo: false,
        badgeText: '🎉 恭喜中奖 🎉',
        showPrizeName: true,
        showPrizeProgress: true,
        showConfetti: true,
        showDepartment: true,
        showTrophy: true,
        trophyEmoji: '🧧'
    }
})

export const mergeCustomAssets = (
    base: CustomAssets,
    overrides?: Partial<CustomAssets>
): CustomAssets => ({
    ...base,
    ...overrides,
    sounds: {
        ...base.sounds,
        ...(overrides?.sounds ?? {})
    }
})

type DisplaySettingsPatch = {
    standby?: Partial<DisplaySettings['standby']>
    countdown?: Partial<DisplaySettings['countdown']>
    winner?: Partial<DisplaySettings['winner']>
}

export const mergeDisplaySettings = (
    base: DisplaySettings,
    overrides?: DisplaySettingsPatch
): DisplaySettings => ({
    standby: {
        ...base.standby,
        ...(overrides?.standby ?? {})
    },
    countdown: {
        ...base.countdown,
        ...(overrides?.countdown ?? {})
    },
    winner: {
        ...base.winner,
        ...(overrides?.winner ?? {})
    }
})
