import { CustomAssets, DisplaySettings } from '../types/lottery'
import {
    createDefaultCustomAssets,
    createDefaultDisplaySettings,
    mergeCustomAssets,
    mergeDisplaySettings
} from '../constants/display-settings'

const DISPLAY_SETTINGS_FILENAME = 'display_settings.json'

export interface DisplaySettingsPayload {
    version: 1
    customAssets: CustomAssets
    displaySettings: DisplaySettings
}

const encodeBase64 = (value: string) => {
    const bytes = new TextEncoder().encode(value)
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize)
        binary += String.fromCharCode(...chunk)
    }
    return btoa(binary)
}

const decodeBase64 = (base64: string) => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
}

const normalizePayload = (payload: Partial<DisplaySettingsPayload>): DisplaySettingsPayload => ({
    version: 1,
    customAssets: mergeCustomAssets(createDefaultCustomAssets(), payload.customAssets),
    displaySettings: mergeDisplaySettings(
        createDefaultDisplaySettings(),
        payload.displaySettings
    )
})

export const saveDisplaySettings = async (payload: DisplaySettingsPayload): Promise<boolean> => {
    try {
        const json = JSON.stringify(payload)
        const base64 = encodeBase64(json)
        const result = await window.electronAPI.saveBackup(DISPLAY_SETTINGS_FILENAME, base64)
        return Boolean(result)
    } catch (error) {
        console.error('Error saving display settings:', error)
        return false
    }
}

export const loadDisplaySettings = async (): Promise<DisplaySettingsPayload | null> => {
    try {
        const base64 = await window.electronAPI.loadBackup(DISPLAY_SETTINGS_FILENAME)
        if (!base64) return null
        const json = decodeBase64(base64)
        const parsed = JSON.parse(json)
        if (!parsed || typeof parsed !== 'object') {
            return normalizePayload({})
        }
        return normalizePayload(parsed as Partial<DisplaySettingsPayload>)
    } catch (error) {
        console.error('Error loading display settings:', error)
        return null
    }
}

export const clearDisplaySettings = async (): Promise<boolean> => {
    try {
        return await window.electronAPI.deleteBackup(DISPLAY_SETTINGS_FILENAME)
    } catch (error) {
        console.error('Error clearing display settings:', error)
        return false
    }
}
