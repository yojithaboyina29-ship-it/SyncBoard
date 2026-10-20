import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Board, Card, List, PresenceUser, Priority, Role } from '../types/index.js';
import { api } from '../services/api.js';
import { getSocket } from '../services/socket.js';
import { useAuth } from './AuthContext.js';

interface BoardContextType {
  board: Board | null;
  isLoading: boolean;
  activeViewers: PresenceUser[];
  userRole: Role;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  priorityFilter: Priority | 'ALL';
  setPriorityFilter: (p: Priority | 'ALL') => void;
  assigneeFilter: string | 'ALL';
  setAssigneeFilter: (a: string | 'ALL') => void;
  loadBoard: (boardId: string) => Promise<void>;
  createList: (title: string) => Promise<void>;
  updateList: (listId: string, title: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  createCard: (listId: string, data: Partial<Card>) => Promise<void>;
  updateCard: (cardId: string, data: Partial<Card>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  moveCardOptimistic: (
    cardId: string,
    sourceListId: string,
    targetListId: string,
    newIndex: number
  ) => Promise<void>;
  triggerConfetti: () => void;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeViewers, setActiveViewers] = useState<PresenceUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'ALL'>('ALL');

  // Keep a ref to previous board state for rollback
  const boardSnapshotRef = useRef<Board | null>(null);

  const loadBoard = useCallback(async (boardId: string) => {
    setIsLoading(true);
    try {
      const res = await api.getBoard(boardId);
      setBoard(res.board);
    } catch (err) {
      console.error('Failed to load board:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Socket.IO event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !board?.id) return;

    // Join board room
    socket.emit('board:join', {
      boardId: board.id,
      avatarUrl: user?.avatarUrl,
    });

    // Listeners
    const handlePresence = (data: { boardId: string; members: PresenceUser[] }) => {
      if (data.boardId === board.id) {
        setActiveViewers(data.members);
      }
    };

    const handleCardCreated = ({ card, listId }: { card: Card; listId: string }) => {
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;
        return {
          ...prev,
          lists: prev.lists.map((l) => {
            if (l.id === listId) {
              const exists = l.cards.some((c) => c.id === card.id);
              if (exists) return l;
              return {
                ...l,
                cards: [...l.cards, card].sort((a, b) => a.position - b.position),
              };
            }
            return l;
          }),
        };
      });
    };

    const handleCardUpdated = ({ card }: { card: Card }) => {
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;
        return {
          ...prev,
          lists: prev.lists.map((l) => ({
            ...l,
            cards: l.cards.map((c) => (c.id === card.id ? { ...c, ...card } : c)),
          })),
        };
      });
    };

    const handleCardMoved = ({
      cardId,
      sourceListId,
      targetListId,
      position,
      card,
    }: {
      cardId: string;
      sourceListId: string;
      targetListId: string;
      position: number;
      card: Card;
    }) => {
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;

        let movingCard: Card | undefined = card;
        // Clean out of source list
        const listsWithoutCard = prev.lists.map((l) => {
          if (l.id === sourceListId) {
            const found = l.cards.find((c) => c.id === cardId);
            if (found && !movingCard) movingCard = found;
            return {
              ...l,
              cards: l.cards.filter((c) => c.id !== cardId),
            };
          }
          return l;
        });

        if (!movingCard) return prev;
        const finalCard = { ...movingCard, listId: targetListId, position };

        return {
          ...prev,
          lists: listsWithoutCard.map((l) => {
            if (l.id === targetListId) {
              const cards = [...l.cards.filter((c) => c.id !== cardId), finalCard];
              cards.sort((a, b) => a.position - b.position);
              return { ...l, cards };
            }
            return l;
          }),
        };
      });
    };

    const handleCardDeleted = ({ cardId, listId }: { cardId: string; listId: string }) => {
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;
        return {
          ...prev,
          lists: prev.lists.map((l) => {
            if (l.id === listId) {
              return { ...l, cards: l.cards.filter((c) => c.id !== cardId) };
            }
            return l;
          }),
        };
      });
    };

    const handleListCreated = (newList: List) => {
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;
        if (prev.lists.some((l) => l.id === newList.id)) return prev;
        return {
          ...prev,
          lists: [...prev.lists, { ...newList, cards: newList.cards || [] }].sort(
            (a, b) => a.position - b.position
          ),
        };
      });
    };

    const handleListUpdated = (updatedList: List) => {
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;
        return {
          ...prev,
          lists: prev.lists.map((l) =>
            l.id === updatedList.id ? { ...l, title: updatedList.title } : l
          ),
        };
      });
    };

    const handleListDeleted = ({ listId }: { listId: string }) => {
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;
        return {
          ...prev,
          lists: prev.lists.filter((l) => l.id !== listId),
        };
      });
    };

    socket.on('presence:update', handlePresence);
    socket.on('card:created', handleCardCreated);
    socket.on('card:updated', handleCardUpdated);
    socket.on('card:moved', handleCardMoved);
    socket.on('card:deleted', handleCardDeleted);
    socket.on('list:created', handleListCreated);
    socket.on('list:updated', handleListUpdated);
    socket.on('list:deleted', handleListDeleted);

    return () => {
      socket.emit('board:leave', { boardId: board.id });
      socket.off('presence:update', handlePresence);
      socket.off('card:created', handleCardCreated);
      socket.off('card:updated', handleCardUpdated);
      socket.off('card:moved', handleCardMoved);
      socket.off('card:deleted', handleCardDeleted);
      socket.off('list:created', handleListCreated);
      socket.off('list:updated', handleListUpdated);
      socket.off('list:deleted', handleListDeleted);
    };
  }, [board?.id, user?.avatarUrl]);

  const triggerConfetti = async () => {
    try {
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (e) {
      // ignore
    }
  };

  // Optimistic Card Move with Rollback
  const moveCardOptimistic = async (
    cardId: string,
    sourceListId: string,
    targetListId: string,
    newIndex: number
  ) => {
    if (!board || !board.lists) return;

    // Snapshot current state for rollback
    boardSnapshotRef.current = JSON.parse(JSON.stringify(board));

    const sourceList = board.lists.find((l) => l.id === sourceListId);
    const targetList = board.lists.find((l) => l.id === targetListId);
    if (!sourceList || !targetList) return;

    const movingCard = sourceList.cards.find((c) => c.id === cardId);
    if (!movingCard) return;

    // Build the new cards array for target list to calculate fractional position
    const targetCardsWithoutMoving = targetList.cards.filter((c) => c.id !== cardId);
    const newTargetCards = [...targetCardsWithoutMoving];
    newTargetCards.splice(newIndex, 0, { ...movingCard, listId: targetListId });

    const prevCard = newTargetCards[newIndex - 1];
    const nextCard = newTargetCards[newIndex + 1];
    const prevPos = prevCard ? prevCard.position : null;
    const nextPos = nextCard ? nextCard.position : null;

    // Optimistically apply state
    setBoard((prev) => {
      if (!prev || !prev.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.map((l) => {
          if (l.id === sourceListId && sourceListId === targetListId) {
            return { ...l, cards: newTargetCards };
          }
          if (l.id === sourceListId) {
            return { ...l, cards: l.cards.filter((c) => c.id !== cardId) };
          }
          if (l.id === targetListId) {
            return { ...l, cards: newTargetCards };
          }
          return l;
        }),
      };
    });

    if (targetList.title.toLowerCase().includes('done')) {
      triggerConfetti();
    }

    try {
      const res = await api.moveCard(cardId, {
        targetListId,
        prevPos,
        nextPos,
      });

      // Update with server confirmed position
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;
        return {
          ...prev,
          lists: prev.lists.map((l) => {
            if (l.id === targetListId) {
              return {
                ...l,
                cards: l.cards.map((c) =>
                  c.id === cardId ? { ...c, position: res.position } : c
                ),
              };
            }
            return l;
          }),
        };
      });
    } catch (err: any) {
      console.error('Move card failed, rolling back:', err);
      // Rollback to prior snapshot
      if (boardSnapshotRef.current) {
        setBoard(boardSnapshotRef.current);
      }
      throw err;
    }
  };

  const createList = async (title: string) => {
    if (!board) return;
    const res = await api.createList({ boardId: board.id, title });
    setBoard((prev) => {
      if (!prev || !prev.lists) return prev;
      return {
        ...prev,
        lists: [...prev.lists, { ...res.list, cards: [] }],
      };
    });
  };

  const updateList = async (listId: string, title: string) => {
    await api.updateList(listId, { title });
    setBoard((prev) => {
      if (!prev || !prev.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.map((l) => (l.id === listId ? { ...l, title } : l)),
      };
    });
  };

  const deleteList = async (listId: string) => {
    await api.deleteList(listId);
    setBoard((prev) => {
      if (!prev || !prev.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.filter((l) => l.id !== listId),
      };
    });
  };

  const createCard = async (listId: string, data: Partial<Card>) => {
    const res = await api.createCard({
      listId,
      ...data,
    });
    setBoard((prev) => {
      if (!prev || !prev.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.map((l) => {
          if (l.id === listId) {
            return {
              ...l,
              cards: [...l.cards, res.card].sort((a, b) => a.position - b.position),
            };
          }
          return l;
        }),
      };
    });
  };

  const updateCard = async (cardId: string, data: Partial<Card>) => {
    const res = await api.updateCard(cardId, data);
    setBoard((prev) => {
      if (!prev || !prev.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) => (c.id === cardId ? { ...c, ...res.card } : c)),
        })),
      };
    });
  };

  const deleteCard = async (cardId: string) => {
    await api.deleteCard(cardId);
    setBoard((prev) => {
      if (!prev || !prev.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.map((l) => ({
          ...l,
          cards: l.cards.filter((c) => c.id !== cardId),
        })),
      };
    });
  };

  return (
    <BoardContext.Provider
      value={{
        board,
        isLoading,
        activeViewers,
        userRole: board?.currentUserRole || 'MEMBER',
        searchQuery,
        setSearchQuery,
        priorityFilter,
        setPriorityFilter,
        assigneeFilter,
        setAssigneeFilter,
        loadBoard,
        createList,
        updateList,
        deleteList,
        createCard,
        updateCard,
        deleteCard,
        moveCardOptimistic,
        triggerConfetti,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) throw new Error('useBoard must be used within a BoardProvider');
  return context;
}
