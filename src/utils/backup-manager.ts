import { Prize, Winner, Participant } from '../types/lottery'
import { createBackupData, restoreFromBackup } from './excel-handler'

const BACKUP_FILENAME = 'backup_state.xlsx'

// 儲存自動備份
export async function saveAutoBackup(
    prizes: Prize[],
    winners: Winner[],
    participants: Participant[]
): Promise<boolean> {
    try {
        const data = createBackupData(prizes, winners, participants)
        const result = await window.electronAPI.saveBackup(BACKUP_FILENAME, data)
        return result !== null
    } catch (error) {
        console.error('Error saving auto backup:', error)
        return false
    }
}

// 建立時間戳快照
export async function createSnapshot(
    prizes: Prize[],
    winners: Winner[],
    participants: Participant[]
): Promise<string | null> {
    try {
        const now = new Date()
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 16)
        const filename = `backup_${timestamp}.xlsx`

        const data = createBackupData(prizes, winners, participants)
        const result = await window.electronAPI.saveBackup(filename, data)
        return result
    } catch (error) {
        console.error('Error creating snapshot:', error)
        return null
    }
}

// 檢查是否有未完成的備份
export async function checkForUnfinishedSession(): Promise<boolean> {
    try {
        return await window.electronAPI.checkBackupExists(BACKUP_FILENAME)
    } catch (error) {
        console.error('Error checking backup:', error)
        return false
    }
}

// 載入自動備份
export async function loadAutoBackup(): Promise<{
    prizes: Prize[]
    winners: Winner[]
    participants: Participant[]
} | null> {
    try {
        const data = await window.electronAPI.loadBackup(BACKUP_FILENAME)
        if (!data) return null
        return restoreFromBackup(data)
    } catch (error) {
        console.error('Error loading auto backup:', error)
        return null
    }
}

// 載入指定快照
export async function loadSnapshot(filename: string): Promise<{
    prizes: Prize[]
    winners: Winner[]
    participants: Participant[]
} | null> {
    try {
        const data = await window.electronAPI.loadBackup(filename)
        if (!data) return null
        return restoreFromBackup(data)
    } catch (error) {
        console.error('Error loading snapshot:', error)
        return null
    }
}

// 列出所有快照
export async function listSnapshots(): Promise<string[]> {
    try {
        const files = await window.electronAPI.listBackups()
        return files.filter(f => f.startsWith('backup_') && f !== BACKUP_FILENAME)
    } catch (error) {
        console.error('Error listing snapshots:', error)
        return []
    }
}

// 刪除快照
export async function deleteSnapshot(filename: string): Promise<boolean> {
    try {
        return await window.electronAPI.deleteBackup(filename)
    } catch (error) {
        console.error('Error deleting snapshot:', error)
        return false
    }
}

// 清除自動備份（活動正常結束時）
export async function clearAutoBackup(): Promise<boolean> {
    try {
        return await window.electronAPI.deleteBackup(BACKUP_FILENAME)
    } catch (error) {
        console.error('Error clearing auto backup:', error)
        return false
    }
}
