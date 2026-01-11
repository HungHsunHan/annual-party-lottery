import { useState } from 'react'
import { useLotteryStore } from '../../stores/lottery-store'
import { exportWinners, importWinners } from '../../utils/excel-handler'

type SortBy = 'time' | 'name' | 'prize'

interface WinnerListProps {
    onUpdate: () => void
}

export function WinnerList({ onUpdate }: WinnerListProps) {
    const { winners, removeWinner, prizes, participants } = useLotteryStore()
    const [sortBy, setSortBy] = useState<SortBy>('time')

    const handleExport = async () => {
        if (winners.length === 0) {
            await window.electronAPI.showMessage({
                type: 'warning',
                title: '無法匯出',
                message: '尚無中獎名單可匯出'
            })
            return
        }

        const filePath = await window.electronAPI.saveFile({
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
            defaultPath: `中獎名單_${new Date().toISOString().slice(0, 10)}.xlsx`
        })
        if (!filePath) return

        const data = exportWinners(winners)
        const success = await window.electronAPI.writeFile(filePath, data)

        if (success) {
            await window.electronAPI.showMessage({
                type: 'info',
                title: '匯出成功',
                message: `已儲存至 ${filePath}`
            })
        }
    }

    const handleImport = async () => {
        if (participants.length === 0 || prizes.length === 0) {
            await window.electronAPI.showMessage({
                type: 'warning',
                title: '無法匯入',
                message: '請先匯入人員名單與獎項名單，再匯入中獎資訊。'
            })
            return
        }

        const filePath = await window.electronAPI.selectFile({
            filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
        })
        if (!filePath) return

        const base64Data = await window.electronAPI.readFile(filePath)
        if (!base64Data) {
            await window.electronAPI.showMessage({
                type: 'error',
                title: '匯入失敗',
                message: '無法讀取檔案，請確認檔案是否損壞或格式正確。'
            })
            return
        }

        const result = importWinners(base64Data, participants, prizes)
        if (result.totalRows === 0 || result.winners.length === 0) {
            await window.electronAPI.showMessage({
                type: 'warning',
                title: '匯入結果',
                message: '未偵測到有效的中獎資料，請確認檔案內容。'
            })
            return
        }

        const winnerParticipantIds = new Set(result.winners.map(w => w.participant.id))
        const prizeCounts = new Map<string, number>()
        result.winners.forEach(w => {
            prizeCounts.set(w.prize.id, (prizeCounts.get(w.prize.id) ?? 0) + 1)
        })

        const updatedParticipants = participants.map(p => ({
            ...p,
            hasWon: winnerParticipantIds.has(p.id)
        }))
        const updatedPrizes = prizes.map(p => {
            const count = prizeCounts.get(p.id) ?? 0
            const status = count >= p.quantity ? 'completed' : count > 0 ? 'incomplete' : 'pending'
            return { ...p, drawnCount: count, status }
        })

        const participantsById = new Map(updatedParticipants.map(p => [p.id, p]))
        const prizesById = new Map(updatedPrizes.map(p => [p.id, p]))
        const normalizedWinners = result.winners.map(w => ({
            ...w,
            participant: participantsById.get(w.participant.id) ?? w.participant,
            prize: prizesById.get(w.prize.id) ?? w.prize
        }))

        useLotteryStore.setState({
            participants: updatedParticipants,
            prizes: updatedPrizes,
            winners: normalizedWinners
        })
        useLotteryStore.getState().updateStatistics()
        onUpdate()

        const warningMessage = result.skippedRows > 0
            ? `，已略過 ${result.skippedRows} 筆無法對應的資料`
            : ''

        await window.electronAPI.showMessage({
            type: 'info',
            title: '匯入成功',
            message: `成功匯入 ${result.winners.length} 筆中獎資料${warningMessage}。`
        })
    }

    const handleRemoveWinner = async (winnerId: string) => {
        const result = await window.electronAPI.showMessage({
            type: 'question',
            buttons: ['確認刪除', '取消'],
            defaultId: 1,
            title: '確認刪除',
            message: '確定要刪除此中獎紀錄嗎？是否回到抽獎池會依獎項設定與中獎紀錄決定。'
        })

        if (result === 0) {
            removeWinner(winnerId)
            onUpdate()
        }
    }

    // 排序中獎者
    const sortedWinners = [...winners].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.participant.name.localeCompare(b.participant.name)
            case 'prize':
                const prizeA = prizes.find(p => p.id === a.prize.id)
                const prizeB = prizes.find(p => p.id === b.prize.id)
                return (prizeA?.order ?? 0) - (prizeB?.order ?? 0)
            case 'time':
            default:
                return new Date(b.drawnAt).getTime() - new Date(a.drawnAt).getTime()
        }
    })

    return (
        <div className="card">
            <div className="card-header">
                <h2 className="card-title">🏆 中獎名單</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}>
                        <option value="time">依時間排序</option>
                        <option value="name">依姓名排序</option>
                        <option value="prize">依獎項排序</option>
                    </select>
                    <button className="btn btn-secondary" onClick={handleImport}>
                        📥 匯入 Excel
                    </button>
                    <button className="btn btn-primary" onClick={handleExport}>
                        📤 匯出 Excel
                    </button>
                </div>
            </div>

            <div className="participant-list">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}>#</th>
                            <th>獎項</th>
                            <th>得獎者</th>
                            <th>部門</th>
                            <th>職稱</th>
                            <th>中獎時間</th>
                            <th style={{ width: '80px' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedWinners.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center text-muted p-6">
                                    尚無中獎紀錄
                                </td>
                            </tr>
                        ) : (
                            sortedWinners.map((w, index) => (
                                <tr key={w.id}>
                                    <td className="text-muted">{index + 1}</td>
                                    <td>
                                        <span style={{
                                            background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.875rem'
                                        }}>
                                            🎁 {w.prize.name}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{w.participant.name}</td>
                                    <td>{w.participant.department}</td>
                                    <td>{w.participant.title}</td>
                                    <td className="text-muted">
                                        {new Date(w.drawnAt).toLocaleString('zh-TW')}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleRemoveWinner(w.id)}
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
