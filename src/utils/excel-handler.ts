import * as XLSX from 'xlsx'
import { Participant, Prize, Winner } from '../types/lottery'

// 生成唯一 ID
const generateId = () => Math.random().toString(36).substring(2, 9)

const readWorkbook = (base64Data: string) => {
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return XLSX.read(bytes, { type: 'array' })
}

const toString = (val: any): string => {
    if (val === null || val === undefined) return ''
    return String(val).trim()
}

const toNumber = (val: any, fallback: number): number => {
    const normalized = toString(val)
    if (!normalized) return fallback
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : fallback
}

const toBoolean = (val: any): boolean => {
    if (val === null || val === undefined) return false
    if (typeof val === 'boolean') return val
    const normalized = toString(val).toLowerCase()
    return ['是', 'yes', 'true', '1', 'y'].includes(normalized)
}

const normalizePrizeStatus = (val: any, drawnCount: number, quantity: number): Prize['status'] => {
    const normalized = toString(val).toLowerCase()
    if (['pending', '待抽獎', '待抽'].includes(normalized)) return 'pending'
    if (['in-progress', '抽獎中', '進行中'].includes(normalized)) return 'in-progress'
    if (['incomplete', '未完成'].includes(normalized)) return 'incomplete'
    if (['completed', '已完成'].includes(normalized)) return 'completed'

    if (drawnCount >= quantity) return 'completed'
    if (drawnCount > 0) return 'incomplete'
    return 'pending'
}

const parseDate = (val: any): Date | null => {
    if (val instanceof Date) return val
    const normalized = toString(val)
    if (!normalized) return null
    const parsed = new Date(normalized)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed
}

// 匯入人員名單
export function importParticipants(base64Data: string): Participant[] {
    const workbook = readWorkbook(base64Data)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    const jsonData = XLSX.utils.sheet_to_json<any>(sheet)

    const participants: Participant[] = jsonData.map((row: any) => {
        const name = toString(row['姓名'] || row['name'])
        if (!name) return null

        const id = toString(row['參與者ID'] || row['participantId'] || row['id'])
        const hasWonValue = row['已中獎'] ?? row['hasWon']

        return {
            id: id || generateId(),
            department: toString(row['部門'] || row['department']),
            title: toString(row['職稱'] || row['title']),
            name,
            hasWon: toBoolean(hasWonValue)
        }
    }).filter((p: Participant | null): p is Participant => Boolean(p))

    return participants
}

// 匯入獎項名單
export function importPrizes(base64Data: string): Prize[] {
    const workbook = readWorkbook(base64Data)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    const jsonData = XLSX.utils.sheet_to_json<any>(sheet)

    const prizes: Prize[] = jsonData.map((row: any, index: number) => {
        const name = toString(row['獎項名稱'] || row['prize'] || row['name'])
        if (!name) return null

        const id = toString(row['獎項ID'] || row['prizeId'] || row['id'])
        const iconPath = toString(row['圖示'] || row['iconPath'] || row['icon'])
        const quantity = toNumber(row['總數量'] ?? row['數量'] ?? row['quantity'], 1) || 1
        const drawnCount = toNumber(row['已抽中數量'] ?? row['drawnCount'], 0)
        const order = toNumber(row['排序順位'] ?? row['order'], index)
        const excludeRaw = row['排除已中獎者'] ?? row['excludeWinners']
        const excludeWinners = excludeRaw === undefined ? true : toBoolean(excludeRaw)
        const status = normalizePrizeStatus(row['狀態'] ?? row['status'], drawnCount, quantity)

        return {
            id: id || generateId(),
            name,
            quantity,
            drawnCount,
            order,
            excludeWinners,
            status,
            iconPath: iconPath || undefined
        }
    }).filter((p: Prize | null): p is Prize => Boolean(p))

    return prizes
}

// 匯出人員名單
export function exportParticipants(participants: Participant[]): string {
    const data = participants.map(p => ({
        '參與者ID': p.id,
        '姓名': p.name,
        '部門': p.department,
        '職稱': p.title,
        '已中獎': p.hasWon ? '是' : '否'
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants')

    worksheet['!cols'] = [
        { wch: 14 },  // 參與者ID
        { wch: 15 },  // 姓名
        { wch: 20 },  // 部門
        { wch: 15 },  // 職稱
        { wch: 10 }   // 已中獎
    ]

    return XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' })
}

// 匯出獎項名單
export function exportPrizes(prizes: Prize[]): string {
    const data = prizes.map(p => ({
        '獎項ID': p.id,
        '獎項名稱': p.name,
        '圖示': p.iconPath || '',
        '總數量': p.quantity,
        '已抽中數量': p.drawnCount,
        '剩餘數量': p.quantity - p.drawnCount,
        '排序順位': p.order,
        '排除已中獎者': p.excludeWinners ? '是' : '否',
        '狀態': p.status
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Prizes')

    worksheet['!cols'] = [
        { wch: 14 },  // 獎項ID
        { wch: 20 },  // 獎項名稱
        { wch: 30 },  // 圖示
        { wch: 10 },  // 總數量
        { wch: 12 },  // 已抽中數量
        { wch: 10 },  // 剩餘數量
        { wch: 10 },  // 排序順位
        { wch: 14 },  // 排除已中獎者
        { wch: 12 }   // 狀態
    ]

    return XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' })
}

// 匯出中獎名單
export function exportWinners(winners: Winner[]): string {
    const data = winners.map(w => ({
        '獎項名稱': w.prize.name,
        '得獎者姓名': w.participant.name,
        '部門': w.participant.department,
        '職稱': w.participant.title,
        '中獎時間': new Date(w.drawnAt).toLocaleString('zh-TW')
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '中獎名單')

    // 設定欄寬
    worksheet['!cols'] = [
        { wch: 20 },  // 獎項名稱
        { wch: 15 },  // 得獎者姓名
        { wch: 20 },  // 部門
        { wch: 15 },  // 職稱
        { wch: 25 }   // 中獎時間
    ]

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' })
    return excelBuffer
}

// 匯出中獎名單（備份用）
export function exportWinnersBackup(winners: Winner[]): string {
    const data = winners.map(w => ({
        '中獎ID': w.id,
        '獎項ID': w.prize.id,
        '獎項名稱': w.prize.name,
        '得獎者ID': w.participant.id,
        '得獎者姓名': w.participant.name,
        '部門': w.participant.department,
        '職稱': w.participant.title,
        '中獎時間': new Date(w.drawnAt).toISOString(),
        '已確認': w.confirmed ? '是' : '否'
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Winners')

    worksheet['!cols'] = [
        { wch: 12 },  // 中獎ID
        { wch: 12 },  // 獎項ID
        { wch: 20 },  // 獎項名稱
        { wch: 12 },  // 得獎者ID
        { wch: 15 },  // 得獎者姓名
        { wch: 20 },  // 部門
        { wch: 15 },  // 職稱
        { wch: 25 },  // 中獎時間
        { wch: 10 }   // 已確認
    ]

    return XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' })
}

export function importWinners(
    base64Data: string,
    participants: Participant[],
    prizes: Prize[]
): {
    winners: Winner[]
    totalRows: number
    skippedRows: number
    warnings: string[]
} {
    const workbook = readWorkbook(base64Data)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    const jsonData = XLSX.utils.sheet_to_json<any>(sheet)
    const warnings: string[] = []
    const winners: Winner[] = []

    jsonData.forEach((row: any, index: number) => {
        const rowNumber = index + 2
        const winnerId = toString(row['中獎ID'] || row['winnerId'] || row['id'])
        const prizeId = toString(row['獎項ID'] || row['prizeId'])
        const prizeName = toString(row['獎項名稱'] || row['prize'] || row['name'])
        const participantId = toString(row['得獎者ID'] || row['參與者ID'] || row['participantId'])
        const participantName = toString(row['得獎者姓名'] || row['姓名'] || row['name'])
        const department = toString(row['部門'] || row['department'])
        const title = toString(row['職稱'] || row['title'])

        let prize: Prize | undefined
        if (prizeId) {
            prize = prizes.find(p => p.id === prizeId)
        }
        if (!prize && prizeName) {
            const matches = prizes.filter(p => p.name === prizeName)
            if (matches.length === 1) {
                prize = matches[0]
            } else if (matches.length > 1) {
                warnings.push(`第 ${rowNumber} 列：獎項名稱重複，無法辨識。`)
            }
        }

        let participant: Participant | undefined
        if (participantId) {
            participant = participants.find(p => p.id === participantId)
        }
        if (!participant && participantName) {
            let matches = participants.filter(p => p.name === participantName)
            if (department) {
                matches = matches.filter(p => p.department === department)
            }
            if (title) {
                matches = matches.filter(p => p.title === title)
            }
            if (matches.length === 1) {
                participant = matches[0]
            } else if (matches.length > 1) {
                warnings.push(`第 ${rowNumber} 列：得獎者資料重複，無法辨識。`)
            }
        }

        if (!prize || !participant) {
            warnings.push(`第 ${rowNumber} 列：獎項或得獎者無法對應，已略過。`)
            return
        }

        const drawnAt = parseDate(row['中獎時間'] || row['drawnAt']) ?? new Date()
        const confirmedValue = row['已確認'] ?? row['confirmed']

        winners.push({
            id: winnerId || generateId(),
            prize,
            participant,
            drawnAt,
            confirmed: confirmedValue === undefined ? true : toBoolean(confirmedValue)
        })
    })

    return {
        winners,
        totalRows: jsonData.length,
        skippedRows: jsonData.length - winners.length,
        warnings
    }
}

// 建立備份檔案
export function createBackupData(
    prizes: Prize[],
    winners: Winner[],
    participants: Participant[]
): string {
    const workbook = XLSX.utils.book_new()

    // Sheet 1: Prizes
    const prizesData = prizes.map(p => ({
        '獎項ID': p.id,
        '獎項名稱': p.name,
        '圖示': p.iconPath || '',
        '總數量': p.quantity,
        '已抽中數量': p.drawnCount,
        '剩餘數量': p.quantity - p.drawnCount,
        '排序順位': p.order,
        '排除已中獎者': p.excludeWinners ? '是' : '否',
        '狀態': p.status
    }))
    const prizesSheet = XLSX.utils.json_to_sheet(prizesData)
    XLSX.utils.book_append_sheet(workbook, prizesSheet, 'Prizes')

    // Sheet 2: Winners
    const winnersData = winners.map(w => ({
        '中獎ID': w.id,
        '獎項名稱': w.prize.name,
        '獎項ID': w.prize.id,
        '得獎者姓名': w.participant.name,
        '得獎者ID': w.participant.id,
        '部門': w.participant.department,
        '職稱': w.participant.title,
        '中獎時間': new Date(w.drawnAt).toISOString(),
        '已確認': w.confirmed ? '是' : '否'
    }))
    const winnersSheet = XLSX.utils.json_to_sheet(winnersData)
    XLSX.utils.book_append_sheet(workbook, winnersSheet, 'Winners')

    // Sheet 3: Pool (剩餘抽獎池)
    const poolData = participants.filter(p => !p.hasWon).map(p => ({
        '參與者ID': p.id,
        '姓名': p.name,
        '部門': p.department,
        '職稱': p.title
    }))
    const poolSheet = XLSX.utils.json_to_sheet(poolData)
    XLSX.utils.book_append_sheet(workbook, poolSheet, 'Pool')

    // Sheet 4: All Participants
    const allParticipantsData = participants.map(p => ({
        '參與者ID': p.id,
        '姓名': p.name,
        '部門': p.department,
        '職稱': p.title,
        '已中獎': p.hasWon ? '是' : '否'
    }))
    const allSheet = XLSX.utils.json_to_sheet(allParticipantsData)
    XLSX.utils.book_append_sheet(workbook, allSheet, 'AllParticipants')

    return XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' })
}

// 從備份檔案恢復狀態
export function restoreFromBackup(base64Data: string): {
    prizes: Prize[]
    winners: Winner[]
    participants: Participant[]
} | null {
    try {
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }

        const workbook = XLSX.read(bytes, { type: 'array' })

        // 讀取 Prizes
        const prizesSheet = workbook.Sheets['Prizes']
        const prizesRaw = XLSX.utils.sheet_to_json<any>(prizesSheet)
        const prizes: Prize[] = prizesRaw.map((row: any) => ({
            id: row['獎項ID'],
            name: row['獎項名稱'],
            iconPath: row['圖示'] || undefined,
            quantity: row['總數量'],
            drawnCount: row['已抽中數量'],
            order: row['排序順位'],
            excludeWinners: row['排除已中獎者'] === '是',
            status: row['狀態'] as Prize['status']
        }))

        // 讀取 All Participants
        const allSheet = workbook.Sheets['AllParticipants']
        const participantsRaw = XLSX.utils.sheet_to_json<any>(allSheet)
        const participants: Participant[] = participantsRaw.map((row: any) => ({
            id: row['參與者ID'],
            name: row['姓名'],
            department: row['部門'],
            title: row['職稱'],
            hasWon: row['已中獎'] === '是'
        }))

        // 讀取 Winners
        const winnersSheet = workbook.Sheets['Winners']
        const winnersRaw = XLSX.utils.sheet_to_json<any>(winnersSheet)
        const winners: Winner[] = winnersRaw.map((row: any) => {
            const prize = prizes.find(p => p.id === row['獎項ID'])!
            const participant = participants.find(p => p.id === row['得獎者ID'])!
            return {
                id: row['中獎ID'],
                prize,
                participant,
                drawnAt: new Date(row['中獎時間']),
                confirmed: row['已確認'] === '是'
            }
        })

        return { prizes, winners, participants }
    } catch (error) {
        console.error('Error restoring from backup:', error)
        return null
    }
}
