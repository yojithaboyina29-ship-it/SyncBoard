import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Card, List } from '../types/index.js';
import { CardItem } from './CardItem.js';
import { Plus, MoreHorizontal, Trash2, Edit2, Check, X } from 'lucide-react';
import { useBoard } from '../context/BoardContext.js';

interface KanbanColumnProps {
  list: List;
  cards: Card[];
  onOpenCreateCard: (listId: string) => void;
  onCardClick: (card: Card) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  list,
  cards,
  onOpenCreateCard,
  onCardClick,
}) => {
  const { userRole, updateList, deleteList } = useBoard();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(list.title);
  const [showMenu, setShowMenu] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: {
      type: 'LIST',
      list,
    },
  });

  const cardIds = cards.map((c) => c.id);

  const handleSaveTitle = async () => {
    if (titleInput.trim() && titleInput !== list.title) {
      await updateList(list.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const isReadOnly = userRole === 'VIEWER';

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 sm:w-80 shrink-0 bg-slate-100/80 dark:bg-slate-900/50 border rounded-xl max-h-[calc(100vh-130px)] transition-all ${
        isOver
          ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Column Header */}
      <div className="p-3 pb-2 flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1 w-full">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                autoFocus
                className="w-full text-xs font-bold px-2 py-1 rounded bg-white dark:bg-slate-800 border border-indigo-400 focus:outline-none"
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 hover:text-emerald-600 transition"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsEditingTitle(false)}
                className="p-1 hover:text-rose-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => !isReadOnly && setIsEditingTitle(true)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider truncate">
                {list.title}
              </h3>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {cards.length}
              </span>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {!isReadOnly && (
            <>
              <button
                onClick={() => onOpenCreateCard(list.id)}
                title="Add card"
                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
              >
                <Plus className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMenu((prev) => !prev)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-20 text-xs">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsEditingTitle(true);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Rename</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        if (confirm(`Delete column "${list.title}" and all its cards?`)) {
                          deleteList(list.id);
                        }
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cards List (Sortable Area) */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              disabled={isReadOnly}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-xs">
            No cards
          </div>
        )}
      </div>

      {/* Quick Add Button at column bottom */}
      {!isReadOnly && (
        <div className="p-2 pt-0">
          <button
            onClick={() => onOpenCreateCard(list.id)}
            className="w-full py-1.5 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add card</span>
          </button>
        </div>
      )}
    </div>
  );
};
