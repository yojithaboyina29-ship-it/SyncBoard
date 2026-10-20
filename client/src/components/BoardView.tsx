import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useBoard } from '../context/BoardContext.js';
import { KanbanColumn } from './KanbanColumn.js';
import { CardItem } from './CardItem.js';
import { Card } from '../types/index.js';
import { Plus, X } from 'lucide-react';

interface BoardViewProps {
  onOpenCreateCard: (listId: string) => void;
  onCardClick: (card: Card) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  onOpenCreateCard,
  onCardClick,
  showToast,
}) => {
  const {
    board,
    isLoading,
    userRole,
    searchQuery,
    priorityFilter,
    assigneeFilter,
    createList,
    moveCardOptimistic,
  } = useBoard();

  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4, // 4px movement before drag activates, allowing clean click
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current?.card as Card;
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !board || !board.lists) return;

    const activeCardId = active.id as string;
    const sourceCard = active.data.current?.card as Card;
    if (!sourceCard) return;

    const sourceListId = sourceCard.listId;
    let targetListId = '';
    let newIndex = 0;

    // Check if dropped directly on a List or on another Card
    if (over.data.current?.type === 'LIST') {
      targetListId = over.id as string;
      const targetList = board.lists.find((l) => l.id === targetListId);
      newIndex = targetList ? targetList.cards.length : 0;
    } else if (over.data.current?.type === 'CARD') {
      const overCard = over.data.current?.card as Card;
      targetListId = overCard.listId;
      const targetList = board.lists.find((l) => l.id === targetListId);
      if (targetList) {
        const overIndex = targetList.cards.findIndex((c) => c.id === overCard.id);
        newIndex = overIndex >= 0 ? overIndex : 0;
      }
    }

    if (!targetListId) return;

    try {
      await moveCardOptimistic(activeCardId, sourceListId, targetListId, newIndex);
    } catch (err: any) {
      showToast(err.message || 'Permission denied: Cannot move card', 'error');
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    try {
      await createList(newListTitle.trim());
      setNewListTitle('');
      setIsAddingList(false);
      showToast('New column created', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create column', 'error');
    }
  };

  if (isLoading && !board) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading board synchronized state...</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            No Board Selected
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a board from the top menu or create a new board to get started.
          </p>
        </div>
      </div>
    );
  }

  // Filter cards per column
  const filteredLists = (board.lists || []).map((list) => {
    let cards = [...list.cards];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cards = cards.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.labels?.some((l) => l.name.toLowerCase().includes(q))
      );
    }

    if (priorityFilter !== 'ALL') {
      cards = cards.filter((c) => c.priority === priorityFilter);
    }

    if (assigneeFilter !== 'ALL') {
      cards = cards.filter((c) => c.assigneeId === assigneeFilter);
    }

    return {
      ...list,
      cards,
    };
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
        <div className="flex items-start gap-5 min-w-max">
          {filteredLists.map((list) => (
            <KanbanColumn
              key={list.id}
              list={list}
              cards={list.cards}
              onOpenCreateCard={onOpenCreateCard}
              onCardClick={onCardClick}
            />
          ))}

          {/* Add Column Button / Form */}
          {userRole !== 'VIEWER' && (
            <div className="w-72 sm:w-80 shrink-0">
              {isAddingList ? (
                <form
                  onSubmit={handleCreateList}
                  className="bg-white dark:bg-slate-900 border border-indigo-400 dark:border-indigo-600 rounded-xl p-3 shadow-md"
                >
                  <input
                    type="text"
                    placeholder="Enter list title..."
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    autoFocus
                    className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 mb-2"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                    >
                      Add List
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingList(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingList(true)}
                  className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add another list</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard ? <CardItem card={activeCard} onClick={() => {}} disabled /> : null}
      </DragOverlay>
    </DndContext>
  );
};
