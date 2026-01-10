type SoundType = 'rolling' | 'winner' | 'countdown' | 'cancel'

class SoundManager {
    private sounds: Map<SoundType, HTMLAudioElement> = new Map()
    private customSounds: Map<SoundType, string> = new Map()

    // 預設音效 (使用 Web Audio API 生成簡單音效)
    private createDefaultSound(type: SoundType): HTMLAudioElement {
        const audio = new Audio()

        // 這裡使用 data URL 建立簡單的預設音效
        // 實際專案中可以替換成真實的音效檔案
        switch (type) {
            case 'rolling':
                // 快速滴答聲
                audio.src = this.generateTone(440, 0.1)
                audio.loop = true
                break
            case 'winner':
                // 歡呼聲效
                audio.src = this.generateTone(880, 0.5)
                break
            case 'countdown':
                // 倒數聲
                audio.src = this.generateTone(660, 0.2)
                break
            case 'cancel':
                // 取消音效
                audio.src = this.generateTone(220, 0.3)
                break
        }

        return audio
    }

    // 生成簡單的音調 (用於預設音效)
    private generateTone(frequency: number, duration: number): string {
        const sampleRate = 44100
        const numSamples = Math.floor(sampleRate * duration)
        const buffer = new Float32Array(numSamples)

        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate
            // 加入淡入淡出
            const envelope = Math.sin(Math.PI * i / numSamples)
            buffer[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3
        }

        // 轉換成 WAV 格式
        const wavBuffer = this.createWavBuffer(buffer, sampleRate)
        const blob = new Blob([wavBuffer], { type: 'audio/wav' })
        return URL.createObjectURL(blob)
    }

    private createWavBuffer(samples: Float32Array, sampleRate: number): ArrayBuffer {
        const buffer = new ArrayBuffer(44 + samples.length * 2)
        const view = new DataView(buffer)

        // WAV header
        const writeString = (offset: number, str: string) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i))
            }
        }

        writeString(0, 'RIFF')
        view.setUint32(4, 36 + samples.length * 2, true)
        writeString(8, 'WAVE')
        writeString(12, 'fmt ')
        view.setUint32(16, 16, true)
        view.setUint16(20, 1, true)
        view.setUint16(22, 1, true)
        view.setUint32(24, sampleRate, true)
        view.setUint32(28, sampleRate * 2, true)
        view.setUint16(32, 2, true)
        view.setUint16(34, 16, true)
        writeString(36, 'data')
        view.setUint32(40, samples.length * 2, true)

        // 寫入音訊資料
        for (let i = 0; i < samples.length; i++) {
            const sample = Math.max(-1, Math.min(1, samples[i]))
            view.setInt16(44 + i * 2, sample * 0x7FFF, true)
        }

        return buffer
    }

    // 初始化音效
    initialize() {
        const types: SoundType[] = ['rolling', 'winner', 'countdown', 'cancel']
        types.forEach(type => {
            this.sounds.set(type, this.createDefaultSound(type))
        })
    }

    // 設定自訂音效
    setCustomSound(type: SoundType, base64Data: string) {
        this.customSounds.set(type, `data:audio/mp3;base64,${base64Data}`)
        const audio = new Audio(`data:audio/mp3;base64,${base64Data}`)
        if (type === 'rolling') {
            audio.loop = true
        }
        this.sounds.set(type, audio)
    }

    // 播放音效
    play(type: SoundType) {
        const sound = this.sounds.get(type)
        if (sound) {
            sound.currentTime = 0
            sound.play().catch(console.error)
        }
    }

    // 停止音效
    stop(type: SoundType) {
        const sound = this.sounds.get(type)
        if (sound) {
            sound.pause()
            sound.currentTime = 0
        }
    }

    // 停止所有音效
    stopAll() {
        this.sounds.forEach(sound => {
            sound.pause()
            sound.currentTime = 0
        })
    }

    // 獲取音效狀態
    hasCustomSound(type: SoundType): boolean {
        return this.customSounds.has(type)
    }
}

export const soundManager = new SoundManager()
