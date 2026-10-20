import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useBoard } from '../context/BoardContext.js';
import { Navbar } from '../components/Navbar.js';
import { BoardView } from '../components/BoardView.js';
import { CardDetailModal } from '../components/CardDetailModal.js';
import { CreateCardModal } from '../components/CreateCardModal.js';
import { WorkspaceMembersModal } from '../components/WorkspaceMembersModal.js';
import { CreateBoardModal } from '../components/CreateBoardModal.js';
import { CreateWorkspaceModal } from '../components/CreateWorkspaceModal.js';
import { ActivityDrawer } from '../components/ActivityDrawer.js';
import { MyTasksModal } from '../components/MyTasksModal.js';
import { ShortcutsModal } from '../components/ShortcutsModal.js';
import { Toast, ToastMessage } from '../components/Toast.js';
import { Card } from '../types/index.js';

export const DashboardPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const { board, userRole, loadBoard } = useBoard();

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [createCardListId, setCreateCardListId] = useState<string | null>(null);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isMyTasksOpen, setIsMyTasksOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Automatically load the first board of current workspace if not loaded
  useEffect(() => {
    if (currentWorkspace?.boards && currentWorkspace.boards.length > 0 && !board) {
      loadBoard(currentWorkspace.boards[0].id);
    }
  }, [currentWorkspace?.id, board?.id]);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'n' && userRole !== 'VIEWER') {
        e.preventDefault();
        if (board?.lists && board.lists.length > 0) {
          setCreateCardListId(board.lists[0].id);
        }
      } else if (e.key === 'Escape') {
        setSelectedCard(null);
        setCreateCardListId(null);
        setIsCreateBoardOpen(false);
        setIsCreateWorkspaceOpen(false);
        setIsMembersOpen(false);
        setIsActivityOpen(false);
        setIsMyTasksOpen(false);
        setIsShortcutsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board?.lists, userRole]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Navbar
        onOpenCreateBoard={() => setIsCreateBoardOpen(true)}
        onOpenCreateWorkspace={() => setIsCreateWorkspaceOpen(true)}
        onOpenMembers={() => setIsMembersOpen(true)}
        onOpenActivity={() => setIsActivityOpen(true)}
        onOpenMyTasks={() => setIsMyTasksOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        searchRef={searchInputRef}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <BoardView
          onOpenCreateCard={(listId) => setCreateCardListId(listId)}
          onCardClick={(card) => setSelectedCard(card)}
          showToast={showToast}
        />
      </main>

      {/* Modals & Drawers */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          showToast={showToast}
        />
      )}

      {createCardListId && (
        <CreateCardModal
          listId={createCardListId}
          onClose={() => setCreateCardListId(null)}
          showToast={showToast}
        />
      )}

      {isCreateBoardOpen && (
        <CreateBoardModal
          onClose={() => setIsCreateBoardOpen(false)}
          showToast={showToast}
        />
      )}

      {isCreateWorkspaceOpen && (
        <CreateWorkspaceModal
          onClose={() => setIsCreateWorkspaceOpen(false)}
          showToast={showToast}
        />
      )}

      {isMembersOpen && (
        <WorkspaceMembersModal
          onClose={() => setIsMembersOpen(false)}
          showToast={showToast}
        />
      )}

      {isActivityOpen && (
        <ActivityDrawer onClose={() => setIsActivityOpen(false)} />
      )}

      {isMyTasksOpen && (
        <MyTasksModal
          onClose={() => setIsMyTasksOpen(false)}
          onSelectTask={async (boardId, cardId) => {
            if (board?.id !== boardId) {
              await loadBoard(boardId);
            }
            const foundCard = board?.lists?.flatMap((l) => l.cards).find((c) => c.id === cardId);
            if (foundCard) setSelectedCard(foundCard);
          }}
        />
      )}

      {isShortcutsOpen && (
        <ShortcutsModal onClose={() => setIsShortcutsOpen(false)} />
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
