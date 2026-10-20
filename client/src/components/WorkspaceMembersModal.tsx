import React, { useState, useEffect } from 'react';
import { Role, WorkspaceMember } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useBoard } from '../context/BoardContext.js';
import { X, UserPlus, Shield, Trash2, Mail } from 'lucide-react';

interface WorkspaceMembersModalProps {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const WorkspaceMembersModal: React.FC<WorkspaceMembersModalProps> = ({
  onClose,
  showToast,
}) => {
  const { user, currentWorkspace } = useAuth();
  const { userRole, board, loadBoard } = useBoard();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);

  const isOwner = userRole === 'OWNER';

  const loadMembers = async () => {
    if (!currentWorkspace) return;
    try {
      const res = await api.getWorkspace(currentWorkspace.id);
      setMembers(res.workspace.members || []);
    } catch (err) {
      console.error('Failed to load workspace members:', err);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [currentWorkspace?.id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !inviteEmail.trim() || isInviting) return;

    setIsInviting(true);
    try {
      await api.inviteMember(currentWorkspace.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      showToast(`Invited ${inviteEmail} as ${inviteRole}`, 'success');
      setInviteEmail('');
      await loadMembers();
      if (board) await loadBoard(board.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to invite user', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (memberUserId: string, newRole: Role) => {
    if (!currentWorkspace) return;
    try {
      await api.updateMemberRole(currentWorkspace.id, memberUserId, newRole);
      showToast('Member role updated', 'success');
      await loadMembers();
      if (board) await loadBoard(board.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to update member role', 'error');
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!currentWorkspace) return;
    if (confirm(`Remove ${memberName} from this workspace?`)) {
      try {
        await api.removeMember(currentWorkspace.id, memberUserId);
        showToast('Member removed', 'success');
        await loadMembers();
        if (board) await loadBoard(board.id);
      } catch (err: any) {
        showToast(err.message || 'Failed to remove member', 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Workspace Team & Roles
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Invite form (Owner only) */}
          {isOwner && (
            <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Invite New Teammate</span>
              </h4>
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="teammate@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="MEMBER">Member (Can edit)</option>
                  <option value="VIEWER">Viewer (Read-only)</option>
                </select>

                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg shrink-0 transition"
                >
                  Invite
                </button>
              </form>
            </div>
          )}

          {/* Members List */}
          <div>
            <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-3">
              Current Members ({members.length})
            </h4>

            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        member.user.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                          member.user.name
                        )}`
                      }
                      alt={member.user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {member.user.name} {member.userId === user?.id && '(You)'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{member.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner && member.userId !== user?.id ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.userId, e.target.value as Role)}
                          className="py-1 px-2 text-[11px] font-semibold rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                        >
                          <option value="OWNER">Owner</option>
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>

                        <button
                          onClick={() => handleRemoveMember(member.userId, member.user.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
