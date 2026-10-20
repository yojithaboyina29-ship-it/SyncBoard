import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { calculateFractionalPosition, generateRebalancedPositions } from '../utils/fractionalIndex.js';
import { getSocketIO } from '../sockets/socketHandler.js';
import { Priority } from '@prisma/client';

const createCardSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().min(1, 'Card title is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  labels: z.array(z.object({ name: z.string(), color: z.string() })).optional(),
  prevPos: z.number().nullable().optional(),
  nextPos: z.number().nullable().optional(),
});

const updateCardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  labels: z.array(z.object({ name: z.string(), color: z.string() })).optional(),
});

const moveCardSchema = z.object({
  targetListId: z.string().uuid(),
  prevPos: z.number().nullable().optional(),
  nextPos: z.number().nullable().optional(),
});

export async function createCard(req: Request, res: Response): Promise<void> {
  const data = createCardSchema.parse(req.body);
  const userId = req.user!.id;

  const list = await prisma.list.findUnique({
    where: { id: data.listId },
    select: { boardId: true, title: true },
  });

  if (!list) {
    res.status(404).json({ error: 'Target list not found' });
    return;
  }

  let targetPos: number;
  if (data.prevPos !== undefined || data.nextPos !== undefined) {
    targetPos = calculateFractionalPosition(data.prevPos, data.nextPos).position;
  } else {
    const lastCard = await prisma.card.findFirst({
      where: { listId: data.listId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    targetPos = calculateFractionalPosition(lastCard?.position, null).position;
  }

  const card = await prisma.card.create({
    data: {
      listId: data.listId,
      title: data.title,
      description: data.description,
      priority: data.priority as Priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assigneeId: data.assigneeId,
      position: targetPos,
      labels: data.labels
        ? {
            create: data.labels.map((l) => ({ name: l.name, color: l.color })),
          }
        : undefined,
    },
    include: {
      assignee: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      labels: true,
      _count: {
        select: { comments: true },
      },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      boardId: list.boardId,
      cardId: card.id,
      userId,
      action: 'CARD_CREATED',
      entityId: card.id,
      entityType: 'CARD',
      details: JSON.stringify({
        cardTitle: card.title,
        listTitle: list.title,
      }),
    },
  });

  const io = getSocketIO();
  if (io) {
    io.to(`board:${list.boardId}`).emit('card:created', {
      card,
      listId: data.listId,
    });
  }

  res.status(201).json({ card });
}

export async function updateCard(req: Request, res: Response): Promise<void> {
  const { cardId } = req.params;
  const data = updateCardSchema.parse(req.body);
  const userId = req.user!.id;

  const existing = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      list: { select: { boardId: true } },
    },
  });

  if (!existing) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  // Update labels if provided
  if (data.labels) {
    await prisma.cardLabel.deleteMany({ where: { cardId } });
    if (data.labels.length > 0) {
      await prisma.cardLabel.createMany({
        data: data.labels.map((l) => ({ cardId, name: l.name, color: l.color })),
      });
    }
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority ? (data.priority as Priority) : undefined,
      dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
      assigneeId: data.assigneeId !== undefined ? data.assigneeId : undefined,
    },
    include: {
      assignee: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      labels: true,
      _count: {
        select: { comments: true },
      },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      boardId: existing.list.boardId,
      cardId,
      userId,
      action: 'CARD_UPDATED',
      entityId: cardId,
      entityType: 'CARD',
      details: JSON.stringify({ cardTitle: updated.title }),
    },
  });

  const io = getSocketIO();
  if (io) {
    io.to(`board:${existing.list.boardId}`).emit('card:updated', {
      card: updated,
      listId: existing.listId,
    });
  }

  res.json({ card: updated });
}

export async function moveCard(req: Request, res: Response): Promise<void> {
  const { cardId } = req.params;
  const { targetListId, prevPos, nextPos } = moveCardSchema.parse(req.body);
  const userId = req.user!.id;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      list: { select: { boardId: true, title: true } },
    },
  });

  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const targetList = await prisma.list.findUnique({
    where: { id: targetListId },
    select: { boardId: true, title: true },
  });

  if (!targetList) {
    res.status(404).json({ error: 'Target list not found' });
    return;
  }

  const { position, needsRebalance } = calculateFractionalPosition(prevPos, nextPos);

  const updatedCard = await prisma.card.update({
    where: { id: cardId },
    data: {
      listId: targetListId,
      position,
    },
    include: {
      assignee: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      labels: true,
      _count: {
        select: { comments: true },
      },
    },
  });

  if (needsRebalance) {
    const listCards = await prisma.card.findMany({
      where: { listId: targetListId },
      orderBy: { position: 'asc' },
    });
    const rebalanced = generateRebalancedPositions(listCards);
    await prisma.$transaction(
      rebalanced.map((r) =>
        prisma.card.update({
          where: { id: r.id },
          data: { position: r.position },
        })
      )
    );
  }

  // Log activity
  const details =
    card.listId !== targetListId
      ? {
          cardTitle: card.title,
          fromList: card.list.title,
          toList: targetList.title,
        }
      : {
          cardTitle: card.title,
          inList: card.list.title,
        };

  await prisma.activityLog.create({
    data: {
      boardId: targetList.boardId,
      cardId,
      userId,
      action: 'CARD_MOVED',
      entityId: cardId,
      entityType: 'CARD',
      details: JSON.stringify(details),
    },
  });

  const io = getSocketIO();
  if (io) {
    io.to(`board:${targetList.boardId}`).emit('card:moved', {
      cardId,
      sourceListId: card.listId,
      targetListId,
      position,
      needsRebalance,
      card: updatedCard,
    });
  }

  res.json({
    card: updatedCard,
    position,
    needsRebalance,
  });
}

export async function deleteCard(req: Request, res: Response): Promise<void> {
  const { cardId } = req.params;
  const userId = req.user!.id;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      list: { select: { boardId: true } },
    },
  });

  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  await prisma.card.delete({
    where: { id: cardId },
  });

  await prisma.activityLog.create({
    data: {
      boardId: card.list.boardId,
      userId,
      action: 'CARD_DELETED',
      entityId: cardId,
      entityType: 'CARD',
      details: JSON.stringify({ cardTitle: card.title }),
    },
  });

  const io = getSocketIO();
  if (io) {
    io.to(`board:${card.list.boardId}`).emit('card:deleted', {
      cardId,
      listId: card.listId,
    });
  }

  res.json({ message: 'Card deleted successfully' });
}

export async function getMyTasks(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const cards = await prisma.card.findMany({
    where: {
      assigneeId: userId,
      list: {
        board: {
          workspace: {
            members: {
              some: { userId },
            },
          },
        },
      },
    },
    include: {
      list: {
        select: {
          id: true,
          title: true,
          board: {
            select: {
              id: true,
              title: true,
              workspace: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
      labels: true,
      _count: {
        select: { comments: true },
      },
    },
    orderBy: [
      { dueDate: 'asc' },
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  res.json({ tasks: cards });
}
