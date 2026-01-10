import * as XLSX from 'xlsx'
import { Participant, Prize, Winner } from '../types/lottery'

// 生成唯一 ID
const generateId = () => Math.random().toString(36).substring(2, 9)

// 匯入人員名單
export function importParticipants(base64Data: string): Participant[] {
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }

    const workbook = XLSX.read(bytes, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    const jsonData = XLSX.utils.sheet_to_json<any>(sheet)

    // 確保值轉換為字串（處理 Excel 數字格式）
    const toString = (val: any): string => {
        if (val === null || val === undefined) return ''
        return String(val).trim()
    }

    const participants: Participant[] = jsonData.map((row: any) => ({
        id: generateId(),
        department: toString(row['部門'] || row['department']),
        title: toString(row['職稱'] || row['title']),
        name: toString(row['姓名'] || row['name']),
        hasWon: false
    })).filter((p: Participant) => p.name !== '')

    return participants
}

// 匯入獎項名單
export function importPrizes(base64Data: string): Prize[] {
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }

    const workbook = XLSX.read(bytes, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    const jsonData = XLSX.utils.sheet_to_json<any>(sheet)

    // 確保值轉換為字串（處理 Excel 數字格式）
    const toString = (val: any): string => {
        if (val === null || val === undefined) return ''
        return String(val).trim()
    }

    const prizes: Prize[] = jsonData.map((row: any, index: number) => ({
        id: generateId(),
        name: toString(row['獎項名稱'] || row['prize'] || row['name']),
        quantity: parseInt(String(row['數量'] || row['quantity'] || '1'), 10) || 1,
        drawnCount: 0,
        order: index,
        excludeWinners: true,
        status: 'pending' as const
    })).filter((p: Prize) => p.name !== '')

    return prizes
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
