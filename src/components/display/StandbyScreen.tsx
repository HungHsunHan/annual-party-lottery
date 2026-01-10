import { DrawMode, Prize } from '../../types/lottery'

interface StandbyScreenProps {
    logo?: string
    prizes: Prize[]
    currentPrize?: Prize | null
    drawMode: DrawMode
}

export function StandbyScreen({ logo, prizes, currentPrize, drawMode }: StandbyScreenProps) {
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

            {currentPrize && (
                <div className="prize-preview">
                    <div className="prize-preview-item">
                        <span className="prize-preview-icon">🎁</span>
                        <span className="prize-preview-name">{currentPrize.name}</span>
                        {drawMode === 'one' && (
                            <span className="prize-progress">
                                {currentPrize.drawnCount}/{currentPrize.quantity}
                            </span>
                        )}
                    </div>
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
