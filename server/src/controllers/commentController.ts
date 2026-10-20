import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { getSocketIO } from '../sockets/socketHandler.js';
import { Role } from '@prisma/client';

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
});

export async function createComment(req: Request, res: Response): Promise<void> {
  const { cardId } = req.params;
  const { content } = createCommentSchema.parse(req.body);
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

  const comment = await prisma.comment.create({
    data: {
      cardId,
      authorId: userId,
      content,
    },
    include: {
      author: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      boardId: card.list.boardId,
      cardId,
      userId,
      action: 'COMMENT_ADDED',
      entityId: comment.id,
      entityType: 'COMMENT',
      details: JSON.stringify({
        cardTitle: card.title,
        contentPreview: content.substring(0, 80),
      }),
    },
  });

  const io = getSocketIO();
  if (io) {
    io.to(`board:${card.list.boardId}`).emit('comment:created', {
      cardId,
      comment,
    });
  }

  res.status(201).json({ comment });
}

export async function getCardComments(req: Request, res: Response): Promise<void> {
  const { cardId } = req.params;

  const comments = await prisma.comment.findMany({
    where: { cardId },
    include: {
      author: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ comments });
}

export async function deleteComment(req: Request, res: Response): Promise<void> {
  const { commentId } = req.params;
  const userId = req.user!.id;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      card: {
        include: {
          list: {
            include: {
              board: true,
            },
          },
        },
      },
    },
  });

  if (!comment) {
    res.status(404).json({ error: 'Comment not found' });
    return;
  }

  const isAuthor = comment.authorId === userId;
  const isOwner = req.workspaceMember?.role === Role.OWNER;

  if (!isAuthor && !isOwner) {
    res.status(403).json({ error: 'You do not have permission to delete this comment.' });
    return;
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  const boardId = comment.card.list.boardId;
  const io = getSocketIO();
  if (io) {
    io.to(`board:${boardId}`).emit('comment:deleted', {
      cardId: comment.cardId,
      commentId,
    });
  }

  res.json({ message: 'Comment deleted successfully' });
}
