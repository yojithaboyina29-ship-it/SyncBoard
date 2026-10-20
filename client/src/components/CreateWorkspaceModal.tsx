import React, { useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useBoard } from '../context/BoardContext.js';
import { X, Plus, FolderPlus } from 'lucide-react';

interface CreateWorkspaceModalProps {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  onClose,
  showToast,
}) => {
  const { refreshWorkspaces, setCurrentWorkspace } = useAuth();
  const { loadBoard } = useBoard();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await api.createWorkspace({ name: name.trim() });
      showToast('Workspace created successfully', 'success');
      await refreshWorkspaces();
      setCurrentWorkspace(res.workspace);
      if (res.workspace.boards && res.workspace.boards.length > 0) {
        await loadBoard(res.workspace.boards[0].id);
      }
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create workspace', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Create New Workspace
            </h3>
          </div>
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
              Workspace Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Acme Corp, Hackathon Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-slate-100"
            />
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
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
