import { Prize } from '../types/lottery'

const MIME_BY_EXTENSION: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp'
}

const isAbsolutePath = (value: string) => /^([a-zA-Z]:[\\/]|\\\\|\/)/.test(value)

const normalizePath = (value: string) => value.replace(/\\/g, '/')

const resolveIconPath = (baseDir: string, iconPath: string) => {
    const trimmed = iconPath.trim()
    if (!trimmed) return ''
    const normalized = normalizePath(trimmed).replace(/^\.\//, '')
    if (isAbsolutePath(normalized)) {
        return normalized
    }
    const normalizedBase = normalizePath(baseDir).replace(/\/$/, '')
    return `${normalizedBase}/${normalized}`
}

const toDataUrl = (base64: string, iconPath: string) => {
    const extension = iconPath.split('.').pop()?.toLowerCase() ?? ''
    const mimeType = MIME_BY_EXTENSION[extension] ?? 'image/png'
    return `data:${mimeType};base64,${base64}`
}

export async function hydratePrizeIcons(prizes: Prize[]): Promise<Prize[]> {
    if (!window.electronAPI?.getAppBaseDir) return prizes
    const baseDir = await window.electronAPI.getAppBaseDir()

    const hydrated = await Promise.all(prizes.map(async (prize) => {
        if (!prize.iconPath) {
            if (!prize.iconData) return prize
            return { ...prize, iconData: undefined }
        }
        const resolvedPath = resolveIconPath(baseDir, prize.iconPath)
        if (!resolvedPath) {
            return { ...prize, iconData: undefined }
        }
        const base64 = await window.electronAPI.readFile(resolvedPath)
        if (!base64) {
            return { ...prize, iconData: undefined }
        }
        return { ...prize, iconData: toDataUrl(base64, prize.iconPath) }
    }))

    return hydrated
}
