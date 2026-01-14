import { DisplaySettings, DrawMode, Prize } from '../../types/lottery'

interface StandbyScreenProps {
    logo?: string
    prizes: Prize[]
    currentPrize?: Prize | null
    drawMode: DrawMode
    displaySettings: DisplaySettings
}

export function StandbyScreen({
    logo,
    prizes,
    currentPrize,
    drawMode,
    displaySettings
}: StandbyScreenProps) {
    const { standby } = displaySettings
    const showLogo = standby.showLogo
    const showTitle = standby.title.trim().length > 0
    const showSubtitle = standby.subtitle.trim().length > 0
    const hasPrize = Boolean(currentPrize)
    const showPreview = standby.showPrizePreview && hasPrize
    const showProgress = standby.showPrizeProgress && drawMode === 'one'

    return (
        <div className="standby-screen">
            {showLogo && logo && (
                <img
                    src={`data:image/png;base64,${logo}`}
                    alt="Company Logo"
                    className="standby-logo"
                />
            )}

            {showTitle && <h1 className="standby-title">{standby.title}</h1>}
            {showSubtitle && <p className="standby-subtitle">{standby.subtitle}</p>}

            {showPreview && currentPrize && (
                <div className="prize-preview">
                    <div className="prize-preview-item">
                        <span className="prize-preview-icon">🎁</span>
                        <span className="prize-preview-name">{currentPrize.name}</span>
                        {showProgress && (
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
