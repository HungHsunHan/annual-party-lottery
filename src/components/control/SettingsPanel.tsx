import { useLotteryStore } from '../../stores/lottery-store'
import { listSnapshots, loadSnapshot, deleteSnapshot } from '../../utils/backup-manager'
import { useState, useEffect } from 'react'

interface SettingsPanelProps {
    onUpdate: () => void
}

export function SettingsPanel({ onUpdate }: SettingsPanelProps) {
    const { customAssets, setCustomAssets, globalExcludeWinners, setGlobalExcludeWinners } = useLotteryStore()
    const [snapshots, setSnapshots] = useState<string[]>([])

    useEffect(() => {
        loadSnapshots()
    }, [])

    const loadSnapshots = async () => {
        const list = await listSnapshots()
        setSnapshots(list.sort().reverse())
    }

    const handleUploadLogo = async () => {
        const result = await window.electronAPI.selectImage()
        if (result) {
            setCustomAssets({ logo: result.data })
            onUpdate()
        }
    }

    const handleUploadBackground = async () => {
        const result = await window.electronAPI.selectImage()
        if (result) {
            setCustomAssets({ background: result.data })
            onUpdate()
        }
    }

    const handleUploadSound = async (type: 'rolling' | 'winner' | 'countdown') => {
        const result = await window.electronAPI.selectAudio()
        if (result) {
            setCustomAssets({
                sounds: {
                    ...customAssets.sounds,
                    [type]: result.data
                }
            })
            await window.electronAPI.showMessage({
                type: 'info',
                title: '上傳成功',
                message: `音效已更新`
            })
        }
    }

    const handleLoadSnapshot = async (filename: string) => {
        const result = await window.electronAPI.showMessage({
            type: 'question',
            buttons: ['確認載入', '取消'],
            defaultId: 1,
            title: '載入快照',
            message: `確定要載入快照「${filename}」嗎？\n這將會覆蓋目前的所有資料。`
        })

        if (result === 0) {
            const data = await loadSnapshot(filename)
            if (data) {
                useLotteryStore.getState().setPrizes(data.prizes)
                useLotteryStore.getState().setParticipants(data.participants)
                onUpdate()
                await window.electronAPI.showMessage({
                    type: 'info',
                    title: '載入成功',
                    message: '快照已成功載入'
                })
            }
        }
    }

    const handleDeleteSnapshot = async (filename: string) => {
        const result = await window.electronAPI.showMessage({
            type: 'question',
            buttons: ['確認刪除', '取消'],
            defaultId: 1,
            title: '刪除快照',
            message: `確定要刪除快照「${filename}」嗎？`
        })

        if (result === 0) {
            await deleteSnapshot(filename)
            loadSnapshots()
        }
    }

    return (
        <div>
            {/* 全域設定 */}
            <div className="card mb-4">
                <div className="card-header">
                    <h2 className="card-title">⚙️ 全域設定</h2>
                </div>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={globalExcludeWinners}
                            onChange={e => {
                                setGlobalExcludeWinners(e.target.checked)
                                onUpdate()
                            }}
                            style={{ width: '20px', height: '20px' }}
                        />
                        <span>預設排除已中獎者（新增獎項時的預設值）</span>
                    </label>
                </div>
            </div>

            {/* 自訂素材 */}
            <div className="card mb-4">
                <div className="card-header">
                    <h2 className="card-title">🎨 自訂素材</h2>
                </div>

                <div className="settings-section">
                    <h3 className="settings-title">圖片素材</h3>
                    <div className="settings-grid">
                        <div className="asset-upload" onClick={handleUploadLogo}>
                            {customAssets.logo ? (
                                <>
                                    <img
                                        src={`data:image/png;base64,${customAssets.logo}`}
                                        alt="Logo"
                                        className="asset-preview"
                                    />
                                    <p className="text-sm text-muted">點擊更換 Logo</p>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div>
                                    <p>上傳公司 Logo</p>
                                    <p className="text-sm text-muted">建議尺寸：400x200</p>
                                </>
                            )}
                        </div>

                        <div className="asset-upload" onClick={handleUploadBackground}>
                            {customAssets.background ? (
                                <>
                                    <img
                                        src={`data:image/png;base64,${customAssets.background}`}
                                        alt="Background"
                                        className="asset-preview"
                                    />
                                    <p className="text-sm text-muted">點擊更換背景</p>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
                                    <p>上傳背景圖片</p>
                                    <p className="text-sm text-muted">建議尺寸：1920x1080</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="settings-section">
                    <h3 className="settings-title">音效素材</h3>
                    <div className="settings-grid">
                        <div
                            className="asset-upload"
                            onClick={() => handleUploadSound('rolling')}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎵</div>
                            <p>抽獎滾動音效</p>
                            {customAssets.sounds?.rolling && (
                                <span className="badge badge-completed mt-2">已上傳</span>
                            )}
                        </div>

                        <div
                            className="asset-upload"
                            onClick={() => handleUploadSound('winner')}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                            <p>中獎音效</p>
                            {customAssets.sounds?.winner && (
                                <span className="badge badge-completed mt-2">已上傳</span>
                            )}
                        </div>

                        <div
                            className="asset-upload"
                            onClick={() => handleUploadSound('countdown')}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏱️</div>
                            <p>倒數音效</p>
                            {customAssets.sounds?.countdown && (
                                <span className="badge badge-completed mt-2">已上傳</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 快照管理 */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">📸 快照管理</h2>
                    <button className="btn btn-secondary btn-sm" onClick={loadSnapshots}>
                        🔄 重新整理
                    </button>
                </div>

                <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>
                    💡 快照可用於「時光倒流」，將系統狀態還原到某個時間點。
                </p>

                {snapshots.length === 0 ? (
                    <p className="text-center text-muted p-4">
                        尚無快照。點擊側邊欄的「建立快照」按鈕來建立。
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {snapshots.map(filename => (
                            <div
                                key={filename}
                                className="flex items-center justify-between p-3"
                                style={{
                                    background: 'var(--dark-lighter)',
                                    borderRadius: '0.5rem'
                                }}
                            >
                                <span>📁 {filename}</span>
                                <div className="flex gap-2">
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => handleLoadSnapshot(filename)}
                                    >
                                        載入
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleDeleteSnapshot(filename)}
                                    >
                                        刪除
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
