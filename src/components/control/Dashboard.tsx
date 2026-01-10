import { useState } from 'react'
import { useLotteryStore } from '../../stores/lottery-store'

interface DashboardProps {
    onSync: () => void
}

export function Dashboard({ onSync }: DashboardProps) {
    const { statistics, prizes, drawMode, setDrawMode, currentPrizeId, setCurrentPrize } = useLotteryStore()
    const [showCompleted, setShowCompleted] = useState(false)
    const sortedPrizes = [...prizes].sort((a, b) => a.order - b.order)
    const completedCount = sortedPrizes.filter(prize => prize.status === 'completed').length
    const visiblePrizes = showCompleted
        ? sortedPrizes
        : sortedPrizes.filter(prize => prize.status !== 'completed')
    const hasCompleted = completedCount > 0

    // 找出下一個未完成的獎項
    const nextPrize = prizes
        .filter(p => p.status !== 'completed')
        .sort((a, b) => a.order - b.order)[0]

    // 當前選擇的獎項
    const currentPrize = currentPrizeId
        ? prizes.find(p => p.id === currentPrizeId)
        : nextPrize

    return (
        <div className="dashboard">
            {/* 統計卡片 */}
            <div className="stat-card">
                <div className="stat-icon people">👥</div>
                <div className="stat-info">
                    <h3>剩餘抽獎人數</h3>
                    <div className="stat-value">
                        {statistics.remainingParticipants}
                        <span> / {statistics.totalParticipants}</span>
                    </div>
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon prizes">🎁</div>
                <div className="stat-info">
                    <h3>獎項進度</h3>
                    <div className="stat-value">
                        {statistics.completedPrizes}
                        <span> / {statistics.totalPrizes}</span>
                    </div>
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon completed">✨</div>
                <div className="stat-info">
                    <h3>當前抽獎模式</h3>
                    <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                        {drawMode === 'all' ? '一次全抽' : drawMode === 'one' ? '逐一抽' : '自訂數量'}
                    </div>
                </div>
            </div>

            {/* 快速獎項預覽 */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-header">
                    <h2 className="card-title">🎯 當前/下一個獎項</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {(['one', 'all'] as const).map(mode => (
                            <button
                                key={mode}
                                className={`btn btn-sm ${drawMode === mode ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setDrawMode(mode)}
                            >
                                {mode === 'one' ? '逐一抽' : '一次全抽'}
                            </button>
                        ))}
                    </div>
                </div>

                {currentPrize ? (
                    <div className="flex items-center gap-4">
                        <div style={{
                            fontSize: '3rem',
                            background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                            padding: '1rem 1.5rem',
                            borderRadius: '1rem'
                        }}>
                            🎁
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{currentPrize.name}</h3>
                            <p className="text-muted">
                                進度：{currentPrize.drawnCount} / {currentPrize.quantity}
                                {currentPrize.excludeWinners ? ' (排除已中獎)' : ' (含已中獎)'}
                            </p>
                            <div className="mt-2" style={{ display: 'flex', gap: '0.5rem' }}>
                                <span className={`badge badge-${currentPrize.status}`}>
                                    {currentPrize.status === 'pending' && '待抽獎'}
                                    {currentPrize.status === 'in-progress' && '抽獎中'}
                                    {currentPrize.status === 'incomplete' && '未完成'}
                                    {currentPrize.status === 'completed' && '已完成'}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-muted text-center p-6">
                        請先在「獎項管理」中新增獎項
                    </p>
                )}
            </div>

            {/* 獎項快覽 */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-header">
                    <h2 className="card-title">📋 獎項清單快覽</h2>
                    {hasCompleted && (
                        <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setShowCompleted(prev => !prev)}
                        >
                            {showCompleted
                                ? `收折已完成 (${completedCount})`
                                : `展開已完成 (${completedCount})`}
                        </button>
                    )}
                </div>
                <div className="prize-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {prizes.length === 0 ? (
                        <p className="text-muted text-center p-4">尚無獎項</p>
                    ) : visiblePrizes.length === 0 ? (
                        <p className="text-muted text-center p-4">
                            所有獎項已完成，請展開已完成項目查看
                        </p>
                    ) : (
                        visiblePrizes.map((prize, index) => (
                            <div
                                key={prize.id}
                                className={`prize-item ${prize.id === currentPrizeId ? 'current' : ''}`}
                                onClick={() => {
                                    setCurrentPrize(prize.id)
                                    onSync()
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <span style={{
                                    width: '24px',
                                    height: '24px',
                                    background: 'var(--dark-light)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem'
                                }}>
                                    {index + 1}
                                </span>
                                <div className="prize-info" style={{ flex: 1 }}>
                                    <div className="prize-name">{prize.name}</div>
                                </div>
                                <div className="prize-progress">
                                    ({prize.drawnCount}/{prize.quantity})
                                </div>
                                <span className={`badge badge-${prize.status}`}>
                                    {prize.status === 'pending' && '待抽'}
                                    {prize.status === 'in-progress' && '進行中'}
                                    {prize.status === 'incomplete' && '未完成'}
                                    {prize.status === 'completed' && '✓'}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
