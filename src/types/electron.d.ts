export interface ElectronAPI {
    // 狀態同步
    syncToDisplay: (data: any) => void
    syncToControl: (data: any) => void
    onStateUpdated: (callback: (data: any) => void) => void
    onDisplayEvent: (callback: (data: any) => void) => void

    // 檔案操作
    selectFile: (options?: any) => Promise<string | null>
    saveFile: (options?: any) => Promise<string | null>
    readFile: (filePath: string) => Promise<string | null>
    writeFile: (filePath: string, data: string) => Promise<boolean>

    // 備份操作
    getAppDataPath: () => Promise<string>
    saveBackup: (filename: string, data: string) => Promise<string | null>
    loadBackup: (filename: string) => Promise<string | null>
    checkBackupExists: (filename: string) => Promise<boolean>
    listBackups: () => Promise<string[]>
    deleteBackup: (filename: string) => Promise<boolean>

    // 媒體選擇
    selectImage: () => Promise<{ path: string; data: string; name: string } | null>
    selectAudio: () => Promise<{ path: string; data: string; name: string } | null>

    // UI 控制
    toggleFullscreen: () => void
    showMessage: (options: any) => Promise<number>
}

declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}
