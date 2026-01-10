import { contextBridge, ipcRenderer } from 'electron'

// 暴露給渲染進程的 API
contextBridge.exposeInMainWorld('electronAPI', {
    // 狀態同步
    syncToDisplay: (data: any) => ipcRenderer.send('sync-to-display', data),
    syncToControl: (data: any) => ipcRenderer.send('sync-to-control', data),
    onStateUpdated: (callback: (data: any) => void) => {
        ipcRenderer.on('state-updated', (_, data) => callback(data))
    },
    onDisplayEvent: (callback: (data: any) => void) => {
        ipcRenderer.on('display-event', (_, data) => callback(data))
    },

    // 檔案操作
    selectFile: (options?: any) => ipcRenderer.invoke('select-file', options),
    saveFile: (options?: any) => ipcRenderer.invoke('save-file', options),
    readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath: string, data: string) => ipcRenderer.invoke('write-file', { filePath, data }),

    // 備份操作
    getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
    saveBackup: (filename: string, data: string) => ipcRenderer.invoke('save-backup', { filename, data }),
    loadBackup: (filename: string) => ipcRenderer.invoke('load-backup', filename),
    checkBackupExists: (filename: string) => ipcRenderer.invoke('check-backup-exists', filename),
    listBackups: () => ipcRenderer.invoke('list-backups'),
    deleteBackup: (filename: string) => ipcRenderer.invoke('delete-backup', filename),

    // 媒體選擇
    selectImage: () => ipcRenderer.invoke('select-image'),
    selectAudio: () => ipcRenderer.invoke('select-audio'),

    // UI 控制
    toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
    showMessage: (options: any) => ipcRenderer.invoke('show-message', options)
})
