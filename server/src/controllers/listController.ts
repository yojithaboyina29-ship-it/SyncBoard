import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { calculateFractionalPosition, generateRebalancedPositions } from '../utils/fractionalIndex.js';
import { getSocketIO } from '../sockets/socketHandler.js';

const createListSchema = z.object({
  boardId: z.string().uuid(),
  title: z.string().min(1, 'List title is required'),
  prevPos: z.number().nullable().optional(),
  nextPos: z.number().nullable().optional(),
});

const updateListSchema = z.object({
  title: z.string().min(1, 'List title is required'),
});

const moveListSchema = z.object({
  prevPos: z.number().nullable().optional(),
  nextPos: z.number().nullable().optional(),
});

export async function createList(req: Request, res: Response): Promise<void> {
  const { boardId, title, prevPos, nextPos } = createListSchema.parse(req.body);

  let targetPos: number;
  if (prevPos !== undefined || nextPos !== undefined) {
    targetPos = calculateFractionalPosition(prevPos, nextPos).position;
  } else {
    // Put at end
    const lastList = await prisma.list.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    targetPos = calculateFractionalPosition(lastList?.position, null).position;
  }

  const list = await prisma.list.create({
    data: {
      boardId,
      title,
      position: targetPos,
    },
    include: {
      cards: true,
    },
  });

  const io = getSocketIO();
  if (io) {
    io.to(`board:${boardId}`).emit('list:created', list);
  }

  res.status(201).json({ list });
}

export async function updateList(req: Request, res: Response): Promise<void> {
  const { listId } = req.params;
  const { title } = updateListSchema.parse(req.body);

  const updated = await prisma.list.update({
    where: { id: listId },
    data: { title },
  });

  const io = getSocketIO();
  if (io) {
    io.to(`board:${updated.boardId}`).emit('list:updated', updated);
  }

  res.json({ list: updated });
}

export async function moveList(req: Request, res: Response): Promise<void> {
  const { listId } = req.params;
  const { prevPos, nextPos } = moveListSchema.parse(req.body);

  const existing = await prisma.list.findUnique({
    where: { id: listId },
    select: { boardId: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'List not found' });
    return;
  }

  const { position, needsRebalance } = calculateFractionalPosition(prevPos, nextPos);

  const updated = await prisma.list.update({
    where: { id: listId },
    data: { position },
  });

  // Check if rebalance is required
  if (needsRebalance) {
    const allLists = await prisma.list.findMany({
      where: { boardId: existing.boardId },
      orderBy: { position: 'asc' },
    });
    const rebalanced = generateRebalancedPositions(allLists);
    await prisma.$transaction(
      rebalanced.map((r) =>
        prisma.list.update({
          where: { id: r.id },
          data: { position: r.position },
        })
      )
    );
  }

  const io = getSocketIO();
  if (io) {
    io.to(`board:${existing.boardId}`).emit('list:moved', {
      listId,
      position,
      needsRebalance,
    });
  }

  res.json({ list: updated });
}

export async function deleteList(req: Request, res: Response): Promise<void> {
  const { listId } = req.params;

  const existing = await prisma.list.findUnique({
    where: { id: listId },
    select: { boardId: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'List not found' });
    return;
  }

  await prisma.list.delete({
    where: { id: listId },
  });

  const io = getSocketIO();
  if (io) {
    io.to(`board:${existing.boardId}`).emit('list:deleted', { listId });
  }

  res.json({ message: 'List deleted successfully' });
}
