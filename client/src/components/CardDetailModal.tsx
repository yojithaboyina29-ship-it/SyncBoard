import React, { useState, useEffect } from 'react';
import { Card, Comment, Priority } from '../types/index.js';
import { api } from '../services/api.js';
import { useBoard } from '../context/BoardContext.js';
import { useAuth } from '../context/AuthContext.js';
import {
  X,
  Trash2,
  Send,
  MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CardDetailModalProps {
  card: Card;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const PRESET_LABEL_COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ef4444', // Red
];

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  onClose,
  showToast,
}) => {
  const { user } = useAuth();
  const { board, userRole, updateCard, deleteCard } = useBoard();

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [priority, setPriority] = useState<Priority>(card.priority);
  const [dueDate, setDueDate] = useState<string>(
    card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : ''
  );
  const [assigneeId, setAssigneeId] = useState<string>(card.assigneeId || '');
  const [labels, setLabels] = useState(card.labels || []);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_LABEL_COLORS[0]);
  const [showAddLabel, setShowAddLabel] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const isReadOnly = userRole === 'VIEWER';

  useEffect(() => {
    async function loadComments() {
      try {
        const res = await api.getComments(card.id);
        setComments(res.comments);
      } catch (err) {
        console.error('Failed to load comments:', err);
      }
    }
    loadComments();
  }, [card.id]);

  const handleSaveDetails = async () => {
    if (isReadOnly) return;
    try {
      await updateCard(card.id, {
        title,
        description: description || null,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assigneeId: assigneeId || null,
        labels,
      });
      showToast('Card updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update card', 'error');
    }
  };

  const handleAddLabel = () => {
    if (!newLabelName.trim()) return;
    const newLbl = {
      id: `temp-${Date.now()}`,
      cardId: card.id,
      name: newLabelName.trim(),
      color: selectedColor,
    };
    const updated = [...labels, newLbl];
    setLabels(updated);
    setNewLabelName('');
    setShowAddLabel(false);
    updateCard(card.id, { labels: updated });
  };

  const handleRemoveLabel = (labelId: string) => {
    const updated = labels.filter((l) => l.id !== labelId);
    setLabels(updated);
    updateCard(card.id, { labels: updated });
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmittingComment || isReadOnly) return;
    setIsSubmittingComment(true);
    try {
      const res = await api.createComment(card.id, newComment.trim());
      setComments((prev) => [...prev, res.comment]);
      setNewComment('');
      showToast('Comment posted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      showToast('Comment deleted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete comment', 'error');
    }
  };

  const handleDeleteCard = async () => {
    if (confirm(`Are you sure you want to delete "${card.title}"?`)) {
      try {
        await deleteCard(card.id);
        showToast('Card deleted', 'success');
        onClose();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete card', 'error');
      }
    }
  };

  const members = board?.workspace?.members || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              Task Details
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              disabled={isReadOnly}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveDetails}
              className="w-full text-base font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition py-1"
            />
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs">
            {/* Priority */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
                Priority
              </label>
              <select
                value={priority}
                disabled={isReadOnly}
                onChange={(e) => {
                  setPriority(e.target.value as Priority);
                  updateCard(card.id, { priority: e.target.value as Priority });
                }}
                className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
                Assignee
              </label>
              <select
                value={assigneeId}
                disabled={isReadOnly}
                onChange={(e) => {
                  setAssigneeId(e.target.value);
                  updateCard(card.id, { assigneeId: e.target.value || null });
                }}
                className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name} ({m.role.toLowerCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                disabled={isReadOnly}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  updateCard(card.id, {
                    dueDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                  });
                }}
                className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            {/* Labels */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-500 dark:text-slate-400 font-semibold">
                  Labels
                </label>
                {!isReadOnly && (
                  <button
                    onClick={() => setShowAddLabel((prev) => !prev)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px]"
                  >
                    + Add
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[30px] items-center">
                {labels.map((l) => (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.name}
                    {!isReadOnly && (
                      <button
                        onClick={() => handleRemoveLabel(l.id)}
                        className="hover:opacity-75"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {labels.length === 0 && (
                  <span className="text-slate-400 text-[11px]">No labels</span>
                )}
              </div>

              {showAddLabel && (
                <div className="mt-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-2">
                  <input
                    type="text"
                    placeholder="Label name..."
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5">
                    {PRESET_LABEL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={`w-4 h-4 rounded-full transition-transform ${
                          selectedColor === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddLabel(false)}
                      className="px-2 py-0.5 text-[10px] rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLabel}
                      className="px-2 py-0.5 text-[10px] rounded bg-indigo-600 text-white font-semibold"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              disabled={isReadOnly}
              placeholder="Add more details about this task..."
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSaveDetails}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition resize-none"
            />
          </div>

          {/* Comments Thread */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span>Activity & Comments ({comments.length})</span>
            </h4>

            {/* Comment List */}
            <div className="space-y-3 mb-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start gap-2.5 text-xs bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80"
                >
                  <img
                    src={
                      comment.author.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        comment.author.name
                      )}`
                    }
                    alt={comment.author.name}
                    className="w-6 h-6 rounded-full mt-0.5 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {comment.author.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {(comment.authorId === user?.id || userRole === 'OWNER') && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-slate-400 hover:text-rose-500 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}

              {comments.length === 0 && (
                <p className="text-xs text-slate-400 italic">No comments yet.</p>
              )}
            </div>

            {/* Add Comment Box */}
            {!isReadOnly && (
              <form onSubmit={handleCreateComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30">
          {!isReadOnly && (
            <button
              onClick={handleDeleteCard}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete card</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
