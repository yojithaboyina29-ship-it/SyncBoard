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

      // Resolve boardId from params OR body (e.g. POST /lists sends boardId in body)
      const boardId = req.params.boardId || req.body?.boardId;
      if (!workspaceId && boardId) {
        const board = await prisma.board.findUnique({
          where: { id: boardId },
          select: { workspaceId: true },
        });
        if (board) {
          workspaceId = board.workspaceId;
        }
      }

      // Resolve listId from params OR body (e.g. POST /cards sends listId in body)
      const listId = req.params.listId || req.body?.listId;
      if (!workspaceId && listId) {
        const list = await prisma.list.findUnique({
          where: { id: listId },
          select: { board: { select: { workspaceId: true } } },
        });
        if (list) {
          workspaceId = list.board.workspaceId;
        }
      }

      // Resolve cardId from params OR body
      const cardId = req.params.cardId || req.body?.cardId;
      if (!workspaceId && cardId) {
        const card = await prisma.card.findUnique({
          where: { id: cardId },
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
