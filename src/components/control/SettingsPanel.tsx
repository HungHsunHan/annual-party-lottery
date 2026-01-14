import { useLotteryStore } from '../../stores/lottery-store'
import { listSnapshots, loadSnapshot, deleteSnapshot } from '../../utils/backup-manager'
import { clearDisplaySettings, saveDisplaySettings } from '../../utils/display-settings-storage'
import { DisplaySettings } from '../../types/lottery'
import { DEFAULT_BACKGROUND_URL } from '../../constants/default-assets'
import { useState, useEffect } from 'react'

interface SettingsPanelProps {
    onUpdate: () => void
}

export function SettingsPanel({ onUpdate }: SettingsPanelProps) {
    const {
        customAssets,
        setCustomAssets,
        resetCustomAssets,
        displaySettings,
        setDisplaySettings,
        resetDisplaySettings,
        globalExcludeWinners,
        setGlobalExcludeWinners
    } = useLotteryStore()
    const [snapshots, setSnapshots] = useState<string[]>([])
    const backgroundPreviewUrl = customAssets.background
        ? `data:image/png;base64,${customAssets.background}`
        : DEFAULT_BACKGROUND_URL
    const isUsingDefaultBackground = !customAssets.background

    useEffect(() => {
        loadSnapshots()
    }, [])

    const loadSnapshots = async () => {
        const list = await listSnapshots()
        setSnapshots(list.sort().reverse())
    }

    const syncDisplay = () => {
        const state = useLotteryStore.getState().getFullState()
        window.electronAPI?.syncToDisplay(state)
    }

    const handleUploadLogo = async () => {
        const result = await window.electronAPI.selectImage()
        if (result) {
            setCustomAssets({ logo: result.data })
            syncDisplay()
        }
    }

    const handleUploadBackground = async () => {
        const result = await window.electronAPI.selectImage()
        if (result) {
            setCustomAssets({ background: result.data })
            syncDisplay()
        }
    }

    const handleRemoveLogo = () => {
        setCustomAssets({ logo: undefined })
        syncDisplay()
    }

    const handleRemoveBackground = () => {
        setCustomAssets({ background: undefined })
        syncDisplay()
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
            syncDisplay()
            await window.electronAPI.showMessage({
                type: 'info',
                title: '上傳成功',
                message: `音效已更新`
            })
        }
    }

    const handleRemoveSound = (type: 'rolling' | 'winner' | 'countdown') => {
        setCustomAssets({
            sounds: {
                ...customAssets.sounds,
                [type]: undefined
            }
        })
        syncDisplay()
    }

    const handleStandbySettingChange = (
        updates: Partial<DisplaySettings['standby']>
    ) => {
        setDisplaySettings({ standby: updates })
        syncDisplay()
    }

    const handleCountdownSettingChange = (
        updates: Partial<DisplaySettings['countdown']>
    ) => {
        setDisplaySettings({ countdown: updates })
        syncDisplay()
    }

    const handleWinnerSettingChange = (
        updates: Partial<DisplaySettings['winner']>
    ) => {
        setDisplaySettings({ winner: updates })
        syncDisplay()
    }

    const handleSaveDisplaySettings = async () => {
        const state = useLotteryStore.getState()
        const success = await saveDisplaySettings({
            version: 1,
            customAssets: state.customAssets,
            displaySettings: state.displaySettings
        })

        await window.electronAPI.showMessage({
            type: success ? 'info' : 'error',
            title: success ? '存檔完成' : '存檔失敗',
            message: success ? '畫面設定已儲存' : '無法儲存畫面設定，請稍後再試'
        })
    }

    const handleClearDisplaySettings = async () => {
        const result = await window.electronAPI.showMessage({
            type: 'question',
            buttons: ['確認清除', '取消'],
            defaultId: 1,
            title: '清除畫面設定',
            message: '確定要清除畫面設定並恢復預設值嗎？'
        })

        if (result === 0) {
            await clearDisplaySettings()
            resetCustomAssets()
            resetDisplaySettings()
            syncDisplay()
            await window.electronAPI.showMessage({
                type: 'info',
                title: '已清除',
                message: '畫面設定已恢復預設值'
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
                useLotteryStore.setState({ winners: data.winners })
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
                                syncDisplay()
                            }}
                            style={{ width: '20px', height: '20px' }}
                        />
                        <span>預設排除已中獎者（新增獎項時的預設值）</span>
                    </label>
                </div>
            </div>

            {/* 前台畫面 */}
            <div className="card mb-4">
                <div className="card-header">
                    <h2 className="card-title">🖼️ 前台畫面</h2>
                </div>

                <div className="settings-section">
                    <h3 className="settings-title">主視覺</h3>
                    <div className="settings-grid">
                        <label className="flex flex-col gap-2">
                            <span>大標題文字</span>
                            <input
                                type="text"
                                value={displaySettings.standby.title}
                                onChange={(event) => handleStandbySettingChange({
                                    title: event.target.value
                                })}
                                placeholder="輸入主視覺大標題"
                            />
                        </label>

                        <label className="flex flex-col gap-2">
                            <span>小標題文字</span>
                            <input
                                type="text"
                                value={displaySettings.standby.subtitle}
                                onChange={(event) => handleStandbySettingChange({
                                    subtitle: event.target.value
                                })}
                                placeholder="輸入主視覺小標題"
                            />
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displaySettings.standby.showLogo}
                                onChange={(event) => handleStandbySettingChange({
                                    showLogo: event.target.checked
                                })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>顯示 Logo</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displaySettings.standby.showPrizePreview}
                                onChange={(event) => handleStandbySettingChange({
                                    showPrizePreview: event.target.checked
                                })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>顯示獎項預覽</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displaySettings.standby.showPrizeProgress}
                                onChange={(event) => handleStandbySettingChange({
                                    showPrizeProgress: event.target.checked
                                })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>顯示抽獎進度</span>
                        </label>
                    </div>
                </div>

                <div className="settings-section">
                    <h3 className="settings-title">倒數畫面</h3>
                    <div className="settings-grid">
                        <label className="flex flex-col gap-2">
                            <span>主標籤文字</span>
                            <input
                                type="text"
                                value={displaySettings.countdown.label}
                                onChange={(event) => handleCountdownSettingChange({
                                    label: event.target.value
                                })}
                                placeholder="REVEAL IN"
                            />
                        </label>

                        <label className="flex flex-col gap-2">
                            <span>輔助說明文字</span>
                            <input
                                type="text"
                                value={displaySettings.countdown.subtitle}
                                onChange={(event) => handleCountdownSettingChange({
                                    subtitle: event.target.value
                                })}
                                placeholder="Prepare for the reveal"
                            />
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displaySettings.countdown.showLogo}
                                onChange={(event) => handleCountdownSettingChange({
                                    showLogo: event.target.checked
                                })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>顯示 Logo</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displaySettings.countdown.showPrizeName}
                                onChange={(event) => handleCountdownSettingChange({
                                    showPrizeName: event.target.checked
                                })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>顯示獎項名稱</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displaySettings.countdown.showPrizeProgress}
                                onChange={(event) => handleCountdownSettingChange({
                                    showPrizeProgress: event.target.checked
                                })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>顯示抽獎進度</span>
                        </label>
                    </div>
                </div>

                <div className="settings-section">
                    <h3 className="settings-title">中獎畫面</h3>
                    <div className="settings-grid">
                        <label className="flex flex-col gap-2">
                            <span>恭喜文字</span>
                            <input
                                type="text"
                                value={displaySettings.winner.badgeText}
                                onChange={(event) => handleWinnerSettingChange({
                                    badgeText: event.target.value
                                })}
                                placeholder="🎉 恭喜中奖 🎉"
                            />
                        </label>

                        <label className="flex flex-col gap-2">
                            <span>結尾表情</span>
                            <input
                                type="text"
                                value={displaySettings.winner.trophyEmoji}
                                onChange={(event) => handleWinnerSettingChange({
                                    trophyEmoji: event.target.value
                                })}
                                placeholder="🧧"
                            />
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displaySettings.winner.showLogo}
                                onChange={(event) => handleWinnerSettingChange({
                                    showLogo: event.target.checked
                                })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>顯示 Logo</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displaySettings.winner.showPrizeName}
                                onChange={(event) => handleWinnerSettingChange({
                                    showPrizeName: event.target.checked
                                })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>顯示獎項名稱</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displaySettings.winner.showPrizeProgress}
                                onChange={(event) => handleWinnerSettingChange({
                                    showPrizeProgress: event.target.checked
                                })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>顯示抽獎進度</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displaySettings.winner.showConfetti}
                                onChange={(event) => handleWinnerSettingChange({
                                    showConfetti: event.target.checked
                                })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>顯示彩帶效果</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displaySettings.winner.showDepartment}
                                onChange={(event) => handleWinnerSettingChange({
                                    showDepartment: event.target.checked
                                })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>顯示部門名稱</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displaySettings.winner.showTrophy}
                                onChange={(event) => handleWinnerSettingChange({
                                    showTrophy: event.target.checked
                                })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>顯示結尾表情</span>
                        </label>
                    </div>
                </div>

                <div className="settings-section">
                    <h3 className="settings-title">設定檔</h3>
                    <div className="flex gap-3">
                        <button className="btn btn-primary" onClick={handleSaveDisplaySettings}>
                            💾 儲存畫面設定
                        </button>
                        <button className="btn btn-secondary" onClick={handleClearDisplaySettings}>
                            ♻️ 還原預設
                        </button>
                    </div>
                    <p className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>
                        💡 此存檔會保留 Logo、背景、音效與文字顯示設定，並立即同步到前台。
                    </p>
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
                                    <div className="asset-actions">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-danger asset-remove-btn"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                handleRemoveLogo()
                                            }}
                                        >
                                            移除
                                        </button>
                                    </div>
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
                            <img
                                src={backgroundPreviewUrl}
                                alt="Background"
                                className="asset-preview"
                            />
                            <p className="text-sm text-muted">
                                {isUsingDefaultBackground ? '目前使用預設背景' : '點擊更換背景'}
                            </p>
                            <div className="asset-actions" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        handleRemoveBackground()
                                    }}
                                >
                                    使用預設
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        handleUploadBackground()
                                    }}
                                >
                                    上傳背景圖片
                                </button>
                            </div>
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
                                <>
                                    <span className="badge badge-completed mt-2">已上傳</span>
                                    <div className="asset-actions">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-danger asset-remove-btn"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                handleRemoveSound('rolling')
                                            }}
                                        >
                                            移除
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <div
                            className="asset-upload"
                            onClick={() => handleUploadSound('winner')}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                            <p>中獎音效</p>
                            {customAssets.sounds?.winner && (
                                <>
                                    <span className="badge badge-completed mt-2">已上傳</span>
                                    <div className="asset-actions">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-danger asset-remove-btn"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                handleRemoveSound('winner')
                                            }}
                                        >
                                            移除
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <div
                            className="asset-upload"
                            onClick={() => handleUploadSound('countdown')}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏱️</div>
                            <p>倒數音效</p>
                            {customAssets.sounds?.countdown && (
                                <>
                                    <span className="badge badge-completed mt-2">已上傳</span>
                                    <div className="asset-actions">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-danger asset-remove-btn"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                handleRemoveSound('countdown')
                                            }}
                                        >
                                            移除
                                        </button>
                                    </div>
                                </>
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
                        尚無快照。系統會自動備份，無需手動建立快照。
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
