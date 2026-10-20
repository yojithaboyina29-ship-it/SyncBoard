import React, { useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useBoard } from '../context/BoardContext.js';
import { X, Plus } from 'lucide-react';

interface CreateBoardModalProps {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const BOARD_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
  '#64748b', // Slate
];

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  onClose,
  showToast,
}) => {
  const { currentWorkspace, refreshWorkspaces } = useAuth();
  const { loadBoard } = useBoard();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(BOARD_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await api.createBoard({
        workspaceId: currentWorkspace.id,
        title: title.trim(),
        description: description.trim() || undefined,
        color,
      });
      showToast('Board created successfully', 'success');
      await refreshWorkspaces();
      await loadBoard(res.board.id);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create board', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
            Create Project Board
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Board Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Sprint 14, Marketing Launch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Optional summary of this board's focus..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Board Color Theme
            </label>
            <div className="flex items-center gap-2">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Board</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
