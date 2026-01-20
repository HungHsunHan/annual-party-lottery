import { useEffect } from 'react'
import { ControlPanel } from './components/control/ControlPanel'
import { DisplayScreen } from './components/display/DisplayScreen'
import { useLotteryStore } from './stores/lottery-store'
import { checkForUnfinishedSession, loadAutoBackup } from './utils/backup-manager'
import { loadDisplaySettings } from './utils/display-settings-storage'
import { hydratePrizeIcons } from './utils/prize-icons'

function App() {
    // 使用 hash router 來區分控制台和投影畫面
    const hash = window.location.hash
    const isDisplay = hash.includes('/display')

    const syncState = useLotteryStore((state) => state.syncState)

    useEffect(() => {
        loadSavedDisplaySettings()

        // 監聽狀態更新（投影畫面）
        if (isDisplay) {
            window.electronAPI?.onStateUpdated((data) => {
                syncState(data)
            })
        }

        // 監聯前台事件（控制台）
        if (!isDisplay) {
            window.electronAPI?.onDisplayEvent((data) => {
                console.log('Display event:', data)
                // 處理前台回報的事件
            })

            // 檢查未完成的活動
            checkUnfinishedSession()
        }
    }, [isDisplay, syncState])

    async function loadSavedDisplaySettings() {
        const saved = await loadDisplaySettings()
        if (!saved) return
        const store = useLotteryStore.getState()
        store.replaceCustomAssets(saved.customAssets)
        store.replaceDisplaySettings(saved.displaySettings)
        if (!isDisplay) {
            window.electronAPI?.syncToDisplay(store.getFullState())
        }
    }

    async function checkUnfinishedSession() {
        const hasBackup = await checkForUnfinishedSession()
        if (hasBackup) {
            const result = await window.electronAPI.showMessage({
                type: 'question',
                buttons: ['是，恢復上次進度', '否，開始新活動'],
                defaultId: 0,
                title: '偵測到未完成的活動',
                message: '偵測到未完成的活動紀錄，是否從上次中斷處恢復？'
            })

            if (result === 0) {
                const backup = await loadAutoBackup()
                if (backup) {
                    const hydratedPrizes = await hydratePrizeIcons(backup.prizes)
                    useLotteryStore.getState().setPrizes(hydratedPrizes)
                    useLotteryStore.getState().setParticipants(backup.participants)
                    useLotteryStore.setState({ winners: backup.winners })
                } else {
                    await window.electronAPI.showMessage({
                        type: 'error',
                        title: '恢復失敗',
                        message: '備份資料缺漏或格式不一致，無法恢復。'
                    })
                }
            }
        }
    }

    return isDisplay ? <DisplayScreen /> : <ControlPanel />
}

export default App
