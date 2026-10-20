import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import prisma from '../config/prisma.js';

const ROLE_RANK: Record<Role, number> = {
  OWNER: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export function requireWorkspaceRole(minRole: Role = Role.VIEWER) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      let workspaceId = req.params.workspaceId || req.body?.workspaceId || (req.query?.workspaceId as string);

      // If workspaceId is not direct, check if boardId is provided
      if (!workspaceId && req.params.boardId) {
        const board = await prisma.board.findUnique({
          where: { id: req.params.boardId },
          select: { workspaceId: true },
        });
        if (board) {
          workspaceId = board.workspaceId;
        }
      }

      // If listId is provided
      if (!workspaceId && req.params.listId) {
        const list = await prisma.list.findUnique({
          where: { id: req.params.listId },
          select: { board: { select: { workspaceId: true } } },
        });
        if (list) {
          workspaceId = list.board.workspaceId;
        }
      }

      // If cardId is provided
      if (!workspaceId && req.params.cardId) {
        const card = await prisma.card.findUnique({
          where: { id: req.params.cardId },
          select: { list: { select: { board: { select: { workspaceId: true } } } } },
        });
        if (card) {
          workspaceId = card.list.board.workspaceId;
        }
      }

      if (!workspaceId) {
        res.status(400).json({ error: 'Workspace context could not be determined.' });
        return;
      }

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: req.user.id,
          },
        },
      });

      if (!membership) {
        res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
        return;
      }

      if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
        res.status(403).json({
          error: `Insufficient permissions: Requires ${minRole} role, but your role is ${membership.role}.`,
        });
        return;
      }

      req.workspaceMember = {
        id: membership.id,
        role: membership.role,
        workspaceId: membership.workspaceId,
        userId: membership.userId,
      };

      next();
    } catch (err: any) {
      console.error('RBAC Middleware Error:', err);
      res.status(500).json({ error: 'Internal server error validating permissions.' });
    }
  };
}
