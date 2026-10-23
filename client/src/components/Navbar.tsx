import React, { useState } from 'react';
import {
  LayoutDashboard,
  Plus,
  Users,
  Clock,
  Download,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  HelpCircle,
  FolderKanban,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useBoard } from '../context/BoardContext.js';
import { Priority } from '../types/index.js';
import { useClickOutside } from '../hooks/useClickOutside.js';

interface NavbarProps {
  onOpenCreateBoard: () => void;
  onOpenCreateWorkspace: () => void;
  onOpenMembers: () => void;
  onOpenActivity: () => void;
  onOpenMyTasks: () => void;
  onOpenShortcuts: () => void;
  searchRef?: React.RefObject<HTMLInputElement>;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreateBoard,
  onOpenCreateWorkspace,
  onOpenMembers,
  onOpenActivity,
  onOpenMyTasks,
  onOpenShortcuts,
  searchRef,
}) => {
  const { user, workspaces, currentWorkspace, setCurrentWorkspace, logout } = useAuth();
  const {
    board,
    activeViewers,
    userRole,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    loadBoard,
  } = useBoard();

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Close dropdowns when clicking outside them
  const workspaceMenuRef = useClickOutside<HTMLDivElement>(() => setShowWorkspaceMenu(false), showWorkspaceMenu);
  const boardMenuRef = useClickOutside<HTMLDivElement>(() => setShowBoardMenu(false), showBoardMenu);
  const userMenuRef = useClickOutside<HTMLDivElement>(() => setShowUserMenu(false), showUserMenu);

  const toggleDarkMode = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  const handleExportCsv = async () => {
    if (!board) return;
    try {
      const { api } = await import('../services/api.js');
      await api.exportBoardCsv(board.id);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const roleBadgeColors: Record<string, string> = {
    OWNER: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    MEMBER: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
    VIEWER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand & Workspace / Board Dropdowns */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 select-none">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              SyncBoard
            </span>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Workspace Switcher */}
          <div className="relative" ref={workspaceMenuRef}>
            <button
              onClick={() => setShowWorkspaceMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
              <span className="max-w-[130px] truncate">{currentWorkspace?.name || 'Workspace'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {showWorkspaceMenu && (
              <div className="absolute left-0 mt-1 w-56 rounded-lg bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 text-xs">
                <div className="px-3 py-1 font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">
                  Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setCurrentWorkspace(ws);
                      setShowWorkspaceMenu(false);
                      if (ws.boards && ws.boards.length > 0) {
                        loadBoard(ws.boards[0].id);
                      }
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      ws.id === currentWorkspace?.id ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {ws.role}
                    </span>
                  </button>
                ))}
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <button
                  onClick={() => {
                    setShowWorkspaceMenu(false);
                    onOpenCreateWorkspace();
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
                </button>
              </div>
            )}
          </div>

          {/* Board Selector */}
          {currentWorkspace?.boards && currentWorkspace.boards.length > 0 && (
            <div className="relative" ref={boardMenuRef}>
              <button
                onClick={() => setShowBoardMenu((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: board?.color || '#6366f1' }}
                />
                <span className="max-w-[130px] truncate">{board?.title || 'Select Board'}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {showBoardMenu && (
                <div className="absolute left-0 mt-1 w-52 rounded-lg bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 text-xs">
                  <div className="px-3 py-1 font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">
                    Boards
                  </div>
                  {currentWorkspace.boards.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        loadBoard(b.id);
                        setShowBoardMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        b.id === board?.id ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="truncate">{b.title}</span>
                    </button>
                  ))}
                  {userRole !== 'VIEWER' && (
                    <>
                      <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                      <button
                        onClick={() => {
                          setShowBoardMenu(false);
                          onOpenCreateBoard();
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Board</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Role badge */}
          <span
            className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
              roleBadgeColors[userRole] || roleBadgeColors.MEMBER
            }`}
          >
            {userRole}
          </span>
        </div>

        {/* Middle: Search & Filters */}
        <div className="flex-1 max-w-md hidden lg:flex items-center gap-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search tasks (/)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'ALL')}
            aria-label="Filter cards by priority"
            className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Assignee filter */}
          {board?.workspace?.members && board.workspace.members.length > 0 && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              aria-label="Filter cards by assignee"
              className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 max-w-[120px] truncate"
            >
              <option value="ALL">All Members</option>
              {board.workspace.members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Presence Avatars, Actions & Profile */}
        <div className="flex items-center gap-2">
          {/* Active Presence Indicators */}
          {activeViewers.length > 0 && (
            <div className="flex items-center gap-1.5 mr-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="flex -space-x-2 overflow-hidden">
                {activeViewers.slice(0, 5).map((viewer) => (
                  <img
                    key={viewer.socketId}
                    src={
                      viewer.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        viewer.name
                      )}`
                    }
                    alt={viewer.name}
                    title={`${viewer.name} is viewing this board`}
                    className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 object-cover"
                  />
                ))}
              </div>
              {activeViewers.length > 5 && (
                <span className="text-[10px] font-bold text-slate-500">
                  +{activeViewers.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Shortcuts Button */}
          <button
            onClick={onOpenShortcuts}
            title="Keyboard shortcuts (?)"
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* My Tasks */}
          <button
            onClick={onOpenMyTasks}
            title="My Assigned Tasks"
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <UserCheck className="w-4 h-4" />
          </button>

          {/* Export CSV */}
          {board && (
            <button
              onClick={handleExportCsv}
              title="Export board to CSV"
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Activity Drawer Toggle */}
          <button
            onClick={onOpenActivity}
            title="Audit & Activity Log"
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Members / Invite */}
          <button
            onClick={onOpenMembers}
            title="Workspace Members"
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Dark Mode */}
          <button
            onClick={toggleDarkMode}
            title="Toggle theme"
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-indigo-500/20 transition"
            >
              <img
                src={
                  user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    user?.name || 'User'
                  )}`
                }
                alt={user?.name}
                className="w-7 h-7 rounded-full bg-slate-200"
              />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {user?.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
