import { useState } from 'react'
import { useLotteryStore } from '../../stores/lottery-store'
import { exportParticipants, importParticipants } from '../../utils/excel-handler'

interface ParticipantManagerProps {
    onUpdate: () => void
}

export function ParticipantManager({ onUpdate }: ParticipantManagerProps) {
    const { participants, setParticipants, addParticipant, removeParticipant } = useLotteryStore()
    const [showAddModal, setShowAddModal] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDept, setNewDept] = useState('')
    const [newTitle, setNewTitle] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [filterWon, setFilterWon] = useState<'all' | 'won' | 'not-won'>('all')

    const handleImport = async () => {
        try {
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

            const imported = importParticipants(base64Data)
            if (imported.length > 0) {
                setParticipants(imported)
                onUpdate()
                await window.electronAPI.showMessage({
                    type: 'info',
                    title: '匯入成功',
                    message: `成功匯入 ${imported.length} 位參與人員`
                })
            } else {
                await window.electronAPI.showMessage({
                    type: 'warning',
                    title: '匯入結果',
                    message: '未偵測到有效資料。請確認：\n\n' +
                        '1. 第一列為標題列（姓名 或 name）\n' +
                        '2. 資料在第一個工作表 (Sheet)\n' +
                        '3. 姓名欄位不為空白'
                })
            }
        } catch (error) {
            console.error('Import error:', error)
            await window.electronAPI.showMessage({
                type: 'error',
                title: '匯入錯誤',
                message: `匯入過程發生錯誤：${error instanceof Error ? error.message : '未知錯誤'}\n\n請確認 Excel 格式正確。`
            })
        }
    }

    const handleExport = async () => {
        if (participants.length === 0) {
            await window.electronAPI.showMessage({
                type: 'warning',
                title: '無法匯出',
                message: '尚無人員名單可匯出'
            })
            return
        }

        const filePath = await window.electronAPI.saveFile({
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
            defaultPath: `人員名單_${new Date().toISOString().slice(0, 10)}.xlsx`
        })
        if (!filePath) return

        const data = exportParticipants(participants)
        const success = await window.electronAPI.writeFile(filePath, data)

        if (success) {
            await window.electronAPI.showMessage({
                type: 'info',
                title: '匯出成功',
                message: `已儲存至 ${filePath}`
            })
        }
    }

    const handleAdd = () => {
        if (!newName.trim()) return
        addParticipant({
            name: newName.trim(),
            department: newDept.trim(),
            title: newTitle.trim()
        })
        setNewName('')
        setNewDept('')
        setNewTitle('')
        setShowAddModal(false)
        onUpdate()
    }

    const handleDelete = async (id: string) => {
        const participant = participants.find(p => p.id === id)
        if (participant?.hasWon) {
            await window.electronAPI.showMessage({
                type: 'warning',
                title: '無法刪除',
                message: '此人員已中獎，無法刪除。請先從中獎名單移除。'
            })
            return
        }
        removeParticipant(id)
        onUpdate()
    }

    // 過濾參與者
    const filteredParticipants = participants.filter(p => {
        const matchSearch = p.name.includes(searchTerm) ||
            p.department.includes(searchTerm) ||
            p.title.includes(searchTerm)
        const matchFilter = filterWon === 'all' ||
            (filterWon === 'won' && p.hasWon) ||
            (filterWon === 'not-won' && !p.hasWon)
        return matchSearch && matchFilter
    })

    const wonCount = participants.filter(p => p.hasWon).length
    const notWonCount = participants.filter(p => !p.hasWon).length

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">👥 人員名單</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={handleImport}>
                            📥 匯入 Excel
                        </button>
                        <button className="btn btn-secondary" onClick={handleExport}>
                            📤 匯出 Excel
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                            ➕ 新增人員
                        </button>
                    </div>
                </div>

                {/* 統計 */}
                <div className="flex gap-4 mb-4">
                    <div className="badge badge-completed">
                        ✅ 已中獎：{wonCount}
                    </div>
                    <div className="badge badge-pending">
                        ⏳ 未中獎：{notWonCount}
                    </div>
                    <div className="badge" style={{ background: 'var(--primary)', color: 'white' }}>
                        📊 總計：{participants.length}
                    </div>
                </div>

                {/* 搜尋與篩選 */}
                <div className="flex gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="🔍 搜尋姓名、部門、職稱..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <select
                        value={filterWon}
                        onChange={e => setFilterWon(e.target.value as any)}
                    >
                        <option value="all">全部</option>
                        <option value="won">已中獎</option>
                        <option value="not-won">未中獎</option>
                    </select>
                </div>

                {/* 人員列表 */}
                <div className="participant-list">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>#</th>
                                <th>姓名</th>
                                <th>部門</th>
                                <th>職稱</th>
                                <th style={{ width: '80px' }}>狀態</th>
                                <th style={{ width: '80px' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParticipants.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted p-6">
                                        {participants.length === 0
                                            ? '尚無人員，請匯入 Excel 或手動新增'
                                            : '沒有符合條件的人員'}
                                    </td>
                                </tr>
                            ) : (
                                filteredParticipants.map((p, index) => (
                                    <tr key={p.id}>
                                        <td className="text-muted">{index + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                                        <td>{p.department}</td>
                                        <td>{p.title}</td>
                                        <td>
                                            {p.hasWon ? (
                                                <span className="badge badge-completed">🏆</span>
                                            ) : (
                                                <span className="badge badge-pending">⏳</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(p.id)}
                                                disabled={p.hasWon}
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

            {/* 新增人員 Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>新增人員</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-muted text-sm">姓名 *</label>
                                <input
                                    type="text"
                                    className="w-full mt-2"
                                    placeholder="請輸入姓名"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-muted text-sm">部門</label>
                                <input
                                    type="text"
                                    className="w-full mt-2"
                                    placeholder="請輸入部門"
                                    value={newDept}
                                    onChange={e => setNewDept(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-muted text-sm">職稱</label>
                                <input
                                    type="text"
                                    className="w-full mt-2"
                                    placeholder="請輸入職稱"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2 justify-end mt-4">
                                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                    取消
                                </button>
                                <button className="btn btn-primary" onClick={handleAdd}>
                                    新增
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
