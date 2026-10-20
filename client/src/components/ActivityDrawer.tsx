import React, { useState, useEffect } from 'react';
import { ActivityItem } from '../types/index.js';
import { api } from '../services/api.js';
import { useBoard } from '../context/BoardContext.js';
import { X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityDrawerProps {
  onClose: () => void;
}

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({ onClose }) => {
  const { board } = useBoard();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      if (!board?.id) return;
      setIsLoading(true);
      try {
        const res = await api.getBoardActivity(board.id);
        setActivities(res.activities);
      } catch (err) {
        console.error('Failed to load board activity:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadActivity();
  }, [board?.id]);

  const renderActionText = (item: ActivityItem) => {
    let details: any = {};
    try {
      if (item.details) details = JSON.parse(item.details);
    } catch (e) {
      // ignore
    }

    switch (item.action) {
      case 'CARD_CREATED':
        return (
          <span>
            created card <strong className="text-slate-800 dark:text-slate-200">"{details.cardTitle}"</strong>
            {details.listTitle && <span> in <em>{details.listTitle}</em></span>}
          </span>
        );
      case 'CARD_MOVED':
        if (details.fromList && details.toList) {
          return (
            <span>
              moved <strong className="text-slate-800 dark:text-slate-200">"{details.cardTitle}"</strong> from <em>{details.fromList}</em> to <em>{details.toList}</em>
            </span>
          );
        }
        return (
          <span>
            reordered <strong className="text-slate-800 dark:text-slate-200">"{details.cardTitle}"</strong> in <em>{details.inList}</em>
          </span>
        );
      case 'CARD_UPDATED':
        return (
          <span>
            updated details of <strong className="text-slate-800 dark:text-slate-200">"{details.cardTitle}"</strong>
          </span>
        );
      case 'COMMENT_ADDED':
        return (
          <span>
            commented on <strong className="text-slate-800 dark:text-slate-200">"{details.cardTitle}"</strong>: "{details.contentPreview}"
          </span>
        );
      case 'CARD_DELETED':
        return (
          <span>
            deleted card <strong className="text-slate-800 dark:text-slate-200">"{details.cardTitle}"</strong>
          </span>
        );
      default:
        return <span>performed {item.action.toLowerCase().replace(/_/g, ' ')}</span>;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
            Board Activity Stream
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activities.length > 0 ? (
          activities.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
            >
              <img
                src={
                  item.user.avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    item.user.name
                  )}`
                }
                alt={item.user.name}
                className="w-7 h-7 rounded-full mt-0.5 object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {item.user.name}
                  </span>{' '}
                  {renderActionText(item)}
                </p>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-slate-400">
            No activity recorded yet for this board.
          </div>
        )}
      </div>
    </div>
  );
};
