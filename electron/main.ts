import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

let controlWindow: BrowserWindow | null = null
let displayWindow: BrowserWindow | null = null

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function createControlWindow() {
    controlWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        title: '抽獎系統 - 後台控制',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    if (VITE_DEV_SERVER_URL) {
        controlWindow.loadURL(VITE_DEV_SERVER_URL + '#/control')
    } else {
        controlWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
            hash: '/control'
        })
    }

    controlWindow.on('closed', () => {
        controlWindow = null
        if (displayWindow) {
            displayWindow.close()
        }
    })
}

function createDisplayWindow() {
    const windowConfig: Electron.BrowserWindowConstructorOptions = {
        width: 1280,
        height: 720,
        minWidth: 800,
        minHeight: 600,
        title: '抽獎系統 - 投影畫面',
        frame: true,
        fullscreen: false,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    }

    displayWindow = new BrowserWindow(windowConfig)

    if (VITE_DEV_SERVER_URL) {
        displayWindow.loadURL(VITE_DEV_SERVER_URL + '#/display')
    } else {
        displayWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
            hash: '/display'
        })
    }

    displayWindow.on('closed', () => {
        displayWindow = null
    })
}

// 獲取備份資料夾（開發環境：專案根目錄，打包後：exe 同層）
function getBackupDir(): string {
    const baseDir = app.isPackaged ? path.dirname(process.execPath) : process.cwd()
    const backupDir = path.join(baseDir, 'backup')
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
    }
    return backupDir
}

// IPC 處理器
function setupIpcHandlers() {
    // 同步狀態到前台
    ipcMain.on('sync-to-display', (_, data) => {
        if (displayWindow) {
            displayWindow.webContents.send('state-updated', data)
        }
    })

    // 前台回報給後台
    ipcMain.on('sync-to-control', (_, data) => {
        if (controlWindow) {
            controlWindow.webContents.send('display-event', data)
        }
    })

    // 選擇檔案對話框
    ipcMain.handle('select-file', async (_, options) => {
        const result = await dialog.showOpenDialog(controlWindow!, {
            properties: ['openFile'],
            filters: options.filters || [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
        })
        return result.filePaths[0] || null
    })

    // 儲存檔案對話框
    ipcMain.handle('save-file', async (_, options) => {
        const result = await dialog.showSaveDialog(controlWindow!, {
            filters: options.filters || [{ name: 'Excel Files', extensions: ['xlsx'] }],
            defaultPath: options.defaultPath
        })
        return result.filePath || null
    })

    // 讀取檔案
    ipcMain.handle('read-file', async (_, filePath) => {
        try {
            const buffer = fs.readFileSync(filePath)
            return buffer.toString('base64')
        } catch (error) {
            console.error('Error reading file:', error)
            return null
        }
    })

    // 寫入檔案
    ipcMain.handle('write-file', async (_, { filePath, data }) => {
        try {
            const buffer = Buffer.from(data, 'base64')
            fs.writeFileSync(filePath, buffer)
            return true
        } catch (error) {
            console.error('Error writing file:', error)
            return false
        }
    })

    // 獲取備份資料路徑
    ipcMain.handle('get-app-data-path', () => {
        return getBackupDir()
    })

    // 備份狀態
    ipcMain.handle('save-backup', async (_, { filename, data }) => {
        try {
            const backupPath = path.join(getBackupDir(), filename)
            const buffer = Buffer.from(data, 'base64')
            fs.writeFileSync(backupPath, buffer)
            return backupPath
        } catch (error) {
            console.error('Error saving backup:', error)
            return null
        }
    })

    // 載入備份
    ipcMain.handle('load-backup', async (_, filename) => {
        try {
            const backupPath = path.join(getBackupDir(), filename)
            if (fs.existsSync(backupPath)) {
                const buffer = fs.readFileSync(backupPath)
                return buffer.toString('base64')
            }
            return null
        } catch (error) {
            console.error('Error loading backup:', error)
            return null
        }
    })

    // 檢查備份是否存在
    ipcMain.handle('check-backup-exists', async (_, filename) => {
        const backupPath = path.join(getBackupDir(), filename)
        return fs.existsSync(backupPath)
    })

    // 列出所有備份檔案
    ipcMain.handle('list-backups', async () => {
        try {
            const dataPath = getBackupDir()
            const files = fs.readdirSync(dataPath)
            return files.filter(f => f.endsWith('.xlsx'))
        } catch (error) {
            console.error('Error listing backups:', error)
            return []
        }
    })

    // 刪除備份
    ipcMain.handle('delete-backup', async (_, filename) => {
        try {
            const backupPath = path.join(getBackupDir(), filename)
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath)
                return true
            }
            return false
        } catch (error) {
            console.error('Error deleting backup:', error)
            return false
        }
    })

    // 開關投影視窗全螢幕
    ipcMain.on('toggle-fullscreen', () => {
        if (displayWindow) {
            displayWindow.setFullScreen(!displayWindow.isFullScreen())
        }
    })

    // 選擇圖片檔案
    ipcMain.handle('select-image', async () => {
        const result = await dialog.showOpenDialog(controlWindow!, {
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
        })
        if (result.filePaths[0]) {
            const buffer = fs.readFileSync(result.filePaths[0])
            return {
                path: result.filePaths[0],
                data: buffer.toString('base64'),
                name: path.basename(result.filePaths[0])
            }
        }
        return null
    })

    // 選擇音效檔案
    ipcMain.handle('select-audio', async () => {
        const result = await dialog.showOpenDialog(controlWindow!, {
            properties: ['openFile'],
            filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg'] }]
        })
        if (result.filePaths[0]) {
            const buffer = fs.readFileSync(result.filePaths[0])
            return {
                path: result.filePaths[0],
                data: buffer.toString('base64'),
                name: path.basename(result.filePaths[0])
            }
        }
        return null
    })

    // 顯示訊息對話框
    ipcMain.handle('show-message', async (_, options) => {
        const result = await dialog.showMessageBox(controlWindow!, options)
        return result.response
    })

    // 結束應用程式
    ipcMain.handle('quit-app', () => {
        if (displayWindow && !displayWindow.isDestroyed()) {
            displayWindow.close()
        }
        if (controlWindow && !controlWindow.isDestroyed()) {
            controlWindow.close()
        }
        app.quit()
    })
}

app.whenReady().then(() => {
    setupIpcHandlers()
    createControlWindow()
    createDisplayWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createControlWindow()
            createDisplayWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
