import { useState } from 'react'
import { useLotteryStore } from '../../stores/lottery-store'
import { Dashboard } from './Dashboard'
import { PrizeManager } from './PrizeManager'
import { ParticipantManager } from './ParticipantManager'
import { WinnerList } from './WinnerList'
import { SettingsPanel } from './SettingsPanel'
import { DrawControl } from './DrawControl'
import { saveAutoBackup } from '../../utils/backup-manager'
import './ControlPanel.css'

type Tab = 'dashboard' | 'prizes' | 'participants' | 'winners' | 'settings'

export function ControlPanel() {
    const [activeTab, setActiveTab] = useState<Tab>('dashboard')
    const { systemState } = useLotteryStore()

    const syncToDisplay = () => {
        const state = useLotteryStore.getState().getFullState()
        window.electronAPI?.syncToDisplay(state)
    }

    const handleAutoBackup = async () => {
        const state = useLotteryStore.getState()
        await saveAutoBackup(state.prizes, state.winners, state.participants)
    }

    const handleDataUpdate = async () => {
        await handleAutoBackup()
        syncToDisplay()
    }

    const handleExitApp = async () => {
        const result = await window.electronAPI.showMessage({
            type: 'question',
            buttons: ['離開', '取消'],
            defaultId: 1,
            title: '離開應用程式',
            message: '確定要關閉前台與後台並結束應用程式嗎？'
        })

        if (result === 0) {
            await window.electronAPI.quitApp()
        }
    }

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'dashboard', label: '儀表板', icon: '📊' },
        { id: 'prizes', label: '獎項管理', icon: '🎁' },
        { id: 'participants', label: '人員名單', icon: '👥' },
        { id: 'winners', label: '中獎名單', icon: '🏆' },
        { id: 'settings', label: '設定', icon: '⚙️' }
    ]

    return (
        <div className="control-panel">
            {/* 側邊欄 */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1>🎰 抽獎系統</h1>
                    <span className="version">v1.0</span>
                </div>

                <nav className="sidebar-nav">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="nav-icon">{tab.icon}</span>
                            <span className="nav-label">{tab.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="btn btn-danger w-full" onClick={handleExitApp}>
                        🚪 離開應用程式
                    </button>
                </div>
            </aside>

            {/* 主內容區 */}
            <main className="main-content">
                {/* 頂部抽獎控制區 */}
                {systemState !== 'standby' && (
                    <div className="draw-control-bar">
                        <DrawControl onStateChange={syncToDisplay} onConfirm={handleDataUpdate} />
                    </div>
                )}

                {/* 標籤內容 */}
                <div className="tab-content">
                    {activeTab === 'dashboard' && <Dashboard onSync={syncToDisplay} />}
                    {activeTab === 'prizes' && <PrizeManager onUpdate={handleDataUpdate} />}
                    {activeTab === 'participants' && <ParticipantManager onUpdate={handleDataUpdate} />}
                    {activeTab === 'winners' && <WinnerList onUpdate={handleDataUpdate} />}
                    {activeTab === 'settings' && <SettingsPanel onUpdate={handleDataUpdate} />}
                </div>
            </main>
        </div>
    )
}
