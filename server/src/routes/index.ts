import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspaceRole } from '../middleware/rbac.js';

import * as authController from '../controllers/authController.js';
import * as workspaceController from '../controllers/workspaceController.js';
import * as boardController from '../controllers/boardController.js';
import * as listController from '../controllers/listController.js';
import * as cardController from '../controllers/cardController.js';
import * as commentController from '../controllers/commentController.js';
import * as activityController from '../controllers/activityController.js';

const router = Router();

// ================= AUTH =================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.me);

// ================= WORKSPACES =================
router.post('/workspaces', authenticate, workspaceController.createWorkspace);
router.get('/workspaces', authenticate, workspaceController.getWorkspaces);
router.get(
  '/workspaces/:workspaceId',
  authenticate,
  requireWorkspaceRole(Role.VIEWER),
  workspaceController.getWorkspace
);
router.post(
  '/workspaces/:workspaceId/invites',
  authenticate,
  requireWorkspaceRole(Role.OWNER),
  workspaceController.inviteMember
);
router.patch(
  '/workspaces/:workspaceId/members/:memberUserId/role',
  authenticate,
  requireWorkspaceRole(Role.OWNER),
  workspaceController.updateMemberRole
);
router.delete(
  '/workspaces/:workspaceId/members/:memberUserId',
  authenticate,
  requireWorkspaceRole(Role.VIEWER),
  workspaceController.removeMember
);

// ================= BOARDS =================
router.post(
  '/boards',
  authenticate,
  requireWorkspaceRole(Role.MEMBER),
  boardController.createBoard
);
router.get(
  '/boards/:boardId',
  authenticate,
  requireWorkspaceRole(Role.VIEWER),
  boardController.getBoard
);
router.patch(
  '/boards/:boardId',
  authenticate,
  requireWorkspaceRole(Role.MEMBER),
  boardController.updateBoard
);
router.delete(
  '/boards/:boardId',
  authenticate,
  requireWorkspaceRole(Role.OWNER),
  boardController.deleteBoard
);
router.get(
  '/boards/:boardId/export-csv',
  authenticate,
  requireWorkspaceRole(Role.VIEWER),
  boardController.exportBoardCsv
);

// ================= LISTS =================
router.post(
  '/lists',
  authenticate,
  requireWorkspaceRole(Role.MEMBER),
  listController.createList
);
router.patch(
  '/lists/:listId',
  authenticate,
  requireWorkspaceRole(Role.MEMBER),
  listController.updateList
);
router.patch(
  '/lists/:listId/move',
  authenticate,
  requireWorkspaceRole(Role.MEMBER),
  listController.moveList
);
router.delete(
  '/lists/:listId',
  authenticate,
  requireWorkspaceRole(Role.MEMBER),
  listController.deleteList
);

// ================= CARDS =================
router.get('/cards/my-tasks', authenticate, cardController.getMyTasks);
router.post(
  '/cards',
  authenticate,
  requireWorkspaceRole(Role.MEMBER),
  cardController.createCard
);
router.patch(
  '/cards/:cardId',
  authenticate,
  requireWorkspaceRole(Role.MEMBER),
  cardController.updateCard
);
router.patch(
  '/cards/:cardId/move',
  authenticate,
  requireWorkspaceRole(Role.MEMBER),
  cardController.moveCard
);
router.delete(
  '/cards/:cardId',
  authenticate,
  requireWorkspaceRole(Role.MEMBER),
  cardController.deleteCard
);

// ================= COMMENTS =================
router.get(
  '/cards/:cardId/comments',
  authenticate,
  requireWorkspaceRole(Role.VIEWER),
  commentController.getCardComments
);
router.post(
  '/cards/:cardId/comments',
  authenticate,
  requireWorkspaceRole(Role.MEMBER),
  commentController.createComment
);
router.delete(
  '/comments/:commentId',
  authenticate,
  commentController.deleteComment
);

// ================= ACTIVITY LOG =================
router.get(
  '/boards/:boardId/activity',
  authenticate,
  requireWorkspaceRole(Role.VIEWER),
  activityController.getBoardActivity
);

export default router;
