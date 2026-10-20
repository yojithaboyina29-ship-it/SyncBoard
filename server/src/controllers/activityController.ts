import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export async function getBoardActivity(req: Request, res: Response): Promise<void> {
  const { boardId } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
  const cursor = req.query.cursor as string | undefined;

  const activities = await prisma.activityLog.findMany({
    where: { boardId },
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  const nextCursor = activities.length === limit ? activities[activities.length - 1].id : null;

  res.json({
    activities,
    nextCursor,
  });
}
