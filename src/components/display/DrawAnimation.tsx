import { useState, useEffect, useCallback } from 'react'
import { Prize } from '../../types/lottery'
import { useLotteryStore } from '../../stores/lottery-store'

interface DrawAnimationProps {
    prize: Prize
}

export function DrawAnimation({ prize }: DrawAnimationProps) {
    const { participants } = useLotteryStore()
    const [displayName, setDisplayName] = useState('')
    const [isSlowing, setIsSlowing] = useState(false)

    // 取得可以顯示的名字池
    const namePool = participants
        .filter(p => !p.hasWon || !prize.excludeWinners)
        .map(p => p.name)

    // 隨機選擇名字的動畫
    const shuffleNames = useCallback(() => {
        if (namePool.length === 0) return

        let interval = 50 // 初始速度
        let count = 0
        const maxCount = 30 // 動畫循環次數

        const animate = () => {
            const randomIndex = Math.floor(Math.random() * namePool.length)
            setDisplayName(namePool[randomIndex])
            count++

            if (count >= maxCount) {
                setIsSlowing(true)
                return
            }

            // 逐漸變慢
            if (count > maxCount * 0.7) {
                interval = interval * 1.1
            }

            setTimeout(animate, interval)
        }

        animate()
    }, [namePool])

    useEffect(() => {
        shuffleNames()
    }, [shuffleNames])

    return (
        <div className="draw-animation">
            <div className="draw-prize-name">
                🎁 {prize.name}
            </div>

            <div className="draw-slot-machine">
                <div className="slot-names">
                    <span className={`slot-name ${isSlowing ? 'stopping' : ''}`}>
                        {displayName || '🎲'}
                    </span>
                </div>
            </div>

            <div style={{
                marginTop: '2rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '1.5rem'
            }}>
                🎲 抽獎中...
            </div>
        </div>
    )
}
