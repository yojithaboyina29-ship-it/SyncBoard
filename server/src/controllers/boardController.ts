import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { getSocketIO } from '../sockets/socketHandler.js';

const createBoardSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1, 'Board title is required'),
  description: z.string().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#6366f1'),
});

const updateBoardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
});

export async function createBoard(req: Request, res: Response): Promise<void> {
  const { workspaceId, title, description, color } = createBoardSchema.parse(req.body);

  const board = await prisma.board.create({
    data: {
      workspaceId,
      title,
      description,
      color,
      lists: {
        create: [
          { title: 'To Do', position: 65536 },
          { title: 'In Progress', position: 131072 },
          { title: 'Review', position: 196608 },
          { title: 'Done', position: 262144 },
        ],
      },
    },
    include: {
      lists: {
        orderBy: { position: 'asc' },
      },
    },
  });

  res.status(201).json({ board });
}

export async function getBoard(req: Request, res: Response): Promise<void> {
  const { boardId } = req.params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      workspace: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
        },
      },
      lists: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              assignee: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
              labels: true,
              _count: {
                select: { comments: true },
              },
            },
          },
        },
      },
    },
  });

  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  res.json({
    board: {
      ...board,
      currentUserRole: req.workspaceMember?.role,
    },
  });
}

export async function updateBoard(req: Request, res: Response): Promise<void> {
  const { boardId } = req.params;
  const data = updateBoardSchema.parse(req.body);

  const updated = await prisma.board.update({
    where: { id: boardId },
    data,
  });

  const io = getSocketIO();
  if (io) {
    io.to(`board:${boardId}`).emit('board:updated', updated);
  }

  res.json({ board: updated });
}

export async function deleteBoard(req: Request, res: Response): Promise<void> {
  const { boardId } = req.params;

  await prisma.board.delete({
    where: { id: boardId },
  });

  const io = getSocketIO();
  if (io) {
    io.to(`board:${boardId}`).emit('board:deleted', { boardId });
  }

  res.json({ message: 'Board deleted successfully' });
}

export async function exportBoardCsv(req: Request, res: Response): Promise<void> {
  const { boardId } = req.params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      lists: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              assignee: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  const rows: string[] = ['"List","Title","Description","Priority","Due Date","Assignee"'];

  for (const list of board.lists) {
    for (const card of list.cards) {
      const escape = (val: string | null | undefined) =>
        `"${(val || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;

      rows.push([
        escape(list.title),
        escape(card.title),
        escape(card.description),
        escape(card.priority),
        escape(card.dueDate ? card.dueDate.toISOString().split('T')[0] : ''),
        escape(card.assignee ? card.assignee.name : 'Unassigned'),
      ].join(','));
    }
  }

  const csvContent = rows.join('\r\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${board.title.replace(/[^a-z0-9]/gi, '_')}-export.csv"`);
  res.status(200).send(csvContent);
}
