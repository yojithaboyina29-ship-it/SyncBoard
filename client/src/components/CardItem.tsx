import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Priority } from '../types/index.js';
import { Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface CardItemProps {
  card: Card;
  onClick: () => void;
  disabled?: boolean;
}

const priorityConfig: Record<
  Priority,
  { label: string; bg: string; text: string; dot: string }
> = {
  LOW: {
    label: 'Low',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  MEDIUM: {
    label: 'Medium',
    bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    text: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  HIGH: {
    label: 'High',
    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  URGENT: {
    label: 'Urgent',
    bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
};

export const CardItem: React.FC<CardItemProps> = ({ card, onClick, disabled }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'CARD',
      card,
    },
    disabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const isOverdue = card.dueDate && isPast(new Date(card.dueDate));
  const priority = priorityConfig[card.priority] || priorityConfig.MEDIUM;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-xs hover:shadow-md transition-all cursor-pointer select-none ${
        isDragging ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map((label) => (
            <span
              key={label.id}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white tracking-wide"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Card Title */}
      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-relaxed mb-2.5">
        {card.title}
      </h4>

      {/* Footer Info: Priority, Due Date, Assignee, Comments */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Priority Badge */}
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${priority.bg} ${priority.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
            {priority.label}
          </span>

          {/* Due date */}
          {card.dueDate && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                isOverdue
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {isOverdue ? <AlertCircle className="w-3 h-3 text-rose-500" /> : <Calendar className="w-3 h-3" />}
              {format(new Date(card.dueDate), 'MMM d')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Comments Count */}
          {(card._count?.comments || 0) > 0 && (
            <span className="flex items-center gap-0.5 text-slate-400 text-[10px]">
              <MessageSquare className="w-3 h-3" />
              <span>{card._count?.comments}</span>
            </span>
          )}

          {/* Assignee Avatar */}
          {card.assignee && (
            <img
              src={
                card.assignee.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  card.assignee.name
                )}`
              }
              alt={card.assignee.name}
              title={`Assigned to ${card.assignee.name}`}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
          )}
        </div>
      </div>
    </div>
  );
};
