import { useState } from 'react'
import { useLotteryStore } from '../../stores/lottery-store'
import { exportWinners } from '../../utils/excel-handler'

type SortBy = 'time' | 'name' | 'prize'

export function WinnerList() {
    const { winners, removeWinner, prizes } = useLotteryStore()
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

    const handleRemoveWinner = async (winnerId: string) => {
        const result = await window.electronAPI.showMessage({
            type: 'question',
            buttons: ['確認刪除', '取消'],
            defaultId: 1,
            title: '確認刪除',
            message: '確定要刪除此中獎紀錄嗎？該人員將回到抽獎池。'
        })

        if (result === 0) {
            removeWinner(winnerId)
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
