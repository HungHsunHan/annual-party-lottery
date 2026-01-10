import { Participant, Prize } from '../../types/lottery'

interface ConfirmDialogProps {
    participant: Participant
    prize: Prize
}

export function ConfirmDialog({ participant, prize }: ConfirmDialogProps) {
    return (
        <div className="confirm-dialog">
            <div className="confirm-prize">🎁 {prize.name}</div>

            <div className="confirm-winner-container">
                <div className="confirm-winner-name">{participant.name}</div>
                <div className="confirm-winner-dept">{participant.department}</div>
            </div>

            <div className="confirm-hint">
                ⏳ 等待後台確認...
            </div>
        </div>
    )
}
