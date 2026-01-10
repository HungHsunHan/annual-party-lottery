import { useState } from 'react'
import { useLotteryStore } from '../../stores/lottery-store'
import { Prize } from '../../types/lottery'
import { importPrizes } from '../../utils/excel-handler'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface PrizeManagerProps {
    onUpdate: () => void
}

function SortablePrizeItem({
    prize,
    onQuantityChange,
    onToggleExclude,
    onDelete
}: {
    prize: Prize
    onQuantityChange: (id: string, delta: number) => void
    onToggleExclude: (id: string) => void
    onDelete: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: prize.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    }

    return (
        <div ref={setNodeRef} style={style} className={`prize-item ${isDragging ? 'dragging' : ''}`}>
            <div {...attributes} {...listeners} className="prize-drag-handle">
                ⋮⋮
            </div>
            <div className="prize-info">
                <div className="prize-name">{prize.name}</div>
                <div className="prize-progress">
                    進度：{prize.drawnCount} / {prize.quantity}
                </div>
            </div>

            {/* 數量控制 */}
            <div className="quantity-control">
                <button
                    className="quantity-btn"
                    onClick={() => onQuantityChange(prize.id, -1)}
                    disabled={prize.quantity <= prize.drawnCount}
                >
                    −
                </button>
                <span className="quantity-display">{prize.quantity}</span>
                <button
                    className="quantity-btn"
                    onClick={() => onQuantityChange(prize.id, 1)}
                >
                    +
                </button>
            </div>

            {/* 排除設定 */}
            <button
                className={`btn btn-sm ${prize.excludeWinners ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onToggleExclude(prize.id)}
                title={prize.excludeWinners ? '排除已中獎者' : '含已中獎者'}
            >
                {prize.excludeWinners ? '🚫' : '✅'}
            </button>

            {/* 狀態標籤 */}
            <span className={`badge badge-${prize.status}`}>
                {prize.status === 'pending' && '待抽獎'}
                {prize.status === 'in-progress' && '抽獎中'}
                {prize.status === 'incomplete' && '未完成'}
                {prize.status === 'completed' && '已完成'}
            </span>

            {/* 刪除按鈕 */}
            <button
                className="btn btn-sm btn-danger"
                onClick={() => onDelete(prize.id)}
                disabled={prize.drawnCount > 0}
                title={prize.drawnCount > 0 ? '已有中獎紀錄，無法刪除' : '刪除獎項'}
            >
                🗑️
            </button>
        </div>
    )
}

export function PrizeManager({ onUpdate }: PrizeManagerProps) {
    const {
        prizes,
        setPrizes,
        addPrize,
        removePrize,
        reorderPrizes,
        incrementPrizeQuantity,
        decrementPrizeQuantity,
        updatePrize
    } = useLotteryStore()

    const [showAddModal, setShowAddModal] = useState(false)
    const [newPrizeName, setNewPrizeName] = useState('')
    const [newPrizeQty, setNewPrizeQty] = useState(1)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    )

    const handleImport = async () => {
        const filePath = await window.electronAPI.selectFile({
            filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
        })
        if (!filePath) return

        const base64Data = await window.electronAPI.readFile(filePath)
        if (!base64Data) return

        const imported = importPrizes(base64Data)
        if (imported.length > 0) {
            setPrizes(imported)
            onUpdate()
            await window.electronAPI.showMessage({
                type: 'info',
                title: '匯入成功',
                message: `成功匯入 ${imported.length} 個獎項`
            })
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const oldIndex = prizes.findIndex(p => p.id === active.id)
        const newIndex = prizes.findIndex(p => p.id === over.id)

        const newOrder = arrayMove(prizes, oldIndex, newIndex)
        reorderPrizes(newOrder)
        onUpdate()
    }

    const handleQuantityChange = (id: string, delta: number) => {
        if (delta > 0) {
            incrementPrizeQuantity(id)
        } else {
            decrementPrizeQuantity(id)
        }
        onUpdate()
    }

    const handleToggleExclude = (id: string) => {
        const prize = prizes.find(p => p.id === id)
        if (prize) {
            updatePrize(id, { excludeWinners: !prize.excludeWinners })
            onUpdate()
        }
    }

    const handleAddPrize = () => {
        if (!newPrizeName.trim()) return
        addPrize({
            name: newPrizeName.trim(),
            quantity: newPrizeQty,
            excludeWinners: true
        })
        setNewPrizeName('')
        setNewPrizeQty(1)
        setShowAddModal(false)
        onUpdate()
    }

    const handleDelete = (id: string) => {
        removePrize(id)
        onUpdate()
    }

    const sortedPrizes = [...prizes].sort((a, b) => a.order - b.order)

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">🎁 獎項管理</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={handleImport}>
                            📥 匯入 Excel
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                            ➕ 新增獎項
                        </button>
                    </div>
                </div>

                <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>
                    💡 拖拉獎項可調整抽獎順序。點擊 🚫/✅ 切換是否排除已中獎者。
                </p>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={sortedPrizes.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="prize-list">
                            {sortedPrizes.length === 0 ? (
                                <p className="text-muted text-center p-6">
                                    尚無獎項，請匯入 Excel 或手動新增
                                </p>
                            ) : (
                                sortedPrizes.map(prize => (
                                    <SortablePrizeItem
                                        key={prize.id}
                                        prize={prize}
                                        onQuantityChange={handleQuantityChange}
                                        onToggleExclude={handleToggleExclude}
                                        onDelete={handleDelete}
                                    />
                                ))
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* 新增獎項 Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>新增獎項</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-muted text-sm">獎項名稱</label>
                                <input
                                    type="text"
                                    className="w-full mt-2"
                                    placeholder="例如：現金 5000 元"
                                    value={newPrizeName}
                                    onChange={e => setNewPrizeName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-muted text-sm">數量</label>
                                <input
                                    type="number"
                                    className="w-full mt-2"
                                    min={1}
                                    value={newPrizeQty}
                                    onChange={e => setNewPrizeQty(parseInt(e.target.value) || 1)}
                                />
                            </div>

                            <div className="flex gap-2 justify-end mt-4">
                                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                    取消
                                </button>
                                <button className="btn btn-primary" onClick={handleAddPrize}>
                                    新增
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
