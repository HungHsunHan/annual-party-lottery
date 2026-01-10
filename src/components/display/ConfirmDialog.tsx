import { DrawMode, Participant, Prize } from '../../types/lottery'

interface ConfirmDialogProps {
    participants: Participant[]
    prize: Prize
    drawMode: DrawMode
}

export function ConfirmDialog({ participants, prize, drawMode }: ConfirmDialogProps) {
    const multiple = participants.length > 1

    return (
        <div className="confirm-dialog">
            <div className="confirm-prize">
                🎁 {prize.name}
                {drawMode === 'one' && (
                    <span className="prize-progress">
                        {prize.drawnCount}/{prize.quantity}
                    </span>
                )}
            </div>

            {multiple ? (
                <div className="confirm-winner-grid">
                    {participants.map(participant => (
                        <div key={participant.id} className="confirm-winner-item">
                            <div className="confirm-winner-name">{participant.name}</div>
                            <div className="confirm-winner-dept">{participant.department}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="confirm-winner-container">
                    <div className="confirm-winner-name">{participants[0]?.name}</div>
                    <div className="confirm-winner-dept">{participants[0]?.department}</div>
                </div>
            )}

            <div className="confirm-hint">To be continued...</div>
        </div>
    )
}
