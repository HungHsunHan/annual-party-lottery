import { Prize } from '../../types/lottery'

interface StandbyScreenProps {
    logo?: string
    prizes: Prize[]
}

export function StandbyScreen({ logo, prizes }: StandbyScreenProps) {
    // 取得未完成的獎項
    const pendingPrizes = prizes
        .filter(p => p.status !== 'completed')
        .sort((a, b) => a.order - b.order)
        .slice(0, 6)

    return (
        <div className="standby-screen">
            {logo ? (
                <img
                    src={`data:image/png;base64,${logo}`}
                    alt="Company Logo"
                    className="standby-logo"
                />
            ) : (
                <div style={{ fontSize: '6rem', marginBottom: '2rem' }}>🎰</div>
            )}

            <h1 className="standby-title">年終尾牙抽獎</h1>
            <p className="standby-subtitle">精彩好禮等你來拿！</p>

            {pendingPrizes.length > 0 && (
                <div className="prize-preview">
                    {pendingPrizes.map(prize => (
                        <div key={prize.id} className="prize-preview-item">
                            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>🎁</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white' }}>
                                {prize.name}
                            </span>
                            <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                                x{prize.quantity - prize.drawnCount}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {prizes.length === 0 && (
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '2rem' }}>
                    等待後台設定獎項...
                </p>
            )}
        </div>
    )
}
