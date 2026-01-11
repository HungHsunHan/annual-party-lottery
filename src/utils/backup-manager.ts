import { Prize, Winner, Participant } from '../types/lottery'
import {
    createBackupData,
    exportParticipants,
    exportPrizes,
    exportWinnersBackup,
    importParticipants,
    importPrizes,
    importWinners,
    restoreFromBackup
} from './excel-handler'

const BACKUP_FILENAME = 'backup_state.xlsx'
const BACKUP_PARTICIPANTS_FILENAME = 'backup_participants.xlsx'
const BACKUP_PRIZES_FILENAME = 'backup_prizes.xlsx'
const BACKUP_WINNERS_FILENAME = 'backup_winners.xlsx'

async function loadSeparateBackup(): Promise<{
    prizes: Prize[]
    winners: Winner[]
    participants: Participant[]
} | null> {
    const [participantsData, prizesData, winnersData] = await Promise.all([
        window.electronAPI.loadBackup(BACKUP_PARTICIPANTS_FILENAME),
        window.electronAPI.loadBackup(BACKUP_PRIZES_FILENAME),
        window.electronAPI.loadBackup(BACKUP_WINNERS_FILENAME)
    ])

    if (!participantsData || !prizesData || !winnersData) return null

    const participants = importParticipants(participantsData)
    const prizes = importPrizes(prizesData)
    const winnersResult = importWinners(winnersData, participants, prizes)
    if (winnersResult.skippedRows > 0) {
        console.error('Backup winners mismatch:', winnersResult.warnings.join(' | '))
        return null
    }

    return { prizes, winners: winnersResult.winners, participants }
}

// 儲存自動備份
export async function saveAutoBackup(
    prizes: Prize[],
    winners: Winner[],
    participants: Participant[]
): Promise<boolean> {
    try {
        const [stateData, participantsData, prizesData, winnersData] = [
            createBackupData(prizes, winners, participants),
            exportParticipants(participants),
            exportPrizes(prizes),
            exportWinnersBackup(winners)
        ]

        const results = await Promise.all([
            window.electronAPI.saveBackup(BACKUP_FILENAME, stateData),
            window.electronAPI.saveBackup(BACKUP_PARTICIPANTS_FILENAME, participantsData),
            window.electronAPI.saveBackup(BACKUP_PRIZES_FILENAME, prizesData),
            window.electronAPI.saveBackup(BACKUP_WINNERS_FILENAME, winnersData)
        ])

        return results.every(Boolean)
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
        const [stateExists, participantsExists, prizesExists, winnersExists] = await Promise.all([
            window.electronAPI.checkBackupExists(BACKUP_FILENAME),
            window.electronAPI.checkBackupExists(BACKUP_PARTICIPANTS_FILENAME),
            window.electronAPI.checkBackupExists(BACKUP_PRIZES_FILENAME),
            window.electronAPI.checkBackupExists(BACKUP_WINNERS_FILENAME)
        ])
        return stateExists || (participantsExists && prizesExists && winnersExists)
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
        const [participantsExists, prizesExists, winnersExists] = await Promise.all([
            window.electronAPI.checkBackupExists(BACKUP_PARTICIPANTS_FILENAME),
            window.electronAPI.checkBackupExists(BACKUP_PRIZES_FILENAME),
            window.electronAPI.checkBackupExists(BACKUP_WINNERS_FILENAME)
        ])
        const hasSeparateBackup = participantsExists && prizesExists && winnersExists
        if (hasSeparateBackup) {
            return await loadSeparateBackup()
        }

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
        const reserved = new Set([
            BACKUP_FILENAME,
            BACKUP_PARTICIPANTS_FILENAME,
            BACKUP_PRIZES_FILENAME,
            BACKUP_WINNERS_FILENAME
        ])
        return files.filter(f => f.startsWith('backup_') && !reserved.has(f))
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
        const results = await Promise.all([
            window.electronAPI.deleteBackup(BACKUP_FILENAME),
            window.electronAPI.deleteBackup(BACKUP_PARTICIPANTS_FILENAME),
            window.electronAPI.deleteBackup(BACKUP_PRIZES_FILENAME),
            window.electronAPI.deleteBackup(BACKUP_WINNERS_FILENAME)
        ])
        return results.some(Boolean)
    } catch (error) {
        console.error('Error clearing auto backup:', error)
        return false
    }
}
