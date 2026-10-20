import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { X, CheckSquare, Calendar, AlertCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface MyTasksModalProps {
  onClose: () => void;
  onSelectTask: (boardId: string, cardId: string) => void;
}

export const MyTasksModal: React.FC<MyTasksModalProps> = ({ onClose, onSelectTask }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await api.getMyTasks();
        setTasks(res.tasks || []);
      } catch (err) {
        console.error('Failed to load my tasks:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTasks();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              My Assigned Tasks ({tasks.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tasks.length > 0 ? (
            tasks.map((task) => {
              const isOverdue = task.dueDate && isPast(new Date(task.dueDate));
              return (
                <div
                  key={task.id}
                  onClick={() => {
                    onSelectTask(task.list.board.id, task.id);
                    onClose();
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-900 cursor-pointer transition shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-xs">
                      {task.title}
                    </h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {task.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {task.list.board.title} → <em>{task.list.title}</em>
                    </span>
                    {task.dueDate && (
                      <span
                        className={`flex items-center gap-1 font-medium ${
                          isOverdue ? 'text-rose-500' : 'text-slate-400'
                        }`}
                      >
                        {isOverdue && <AlertCircle className="w-3 h-3" />}
                        <Calendar className="w-3 h-3" />
                        {format(new Date(task.dueDate), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-400">
              No tasks currently assigned to you.
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
