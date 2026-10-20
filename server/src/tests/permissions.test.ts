import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireWorkspaceRole } from '../middleware/rbac';
import { Role } from '@prisma/client';
import prisma from '../config/prisma';

vi.mock('../config/prisma', () => ({
  default: {
    board: {
      findUnique: vi.fn(),
    },
    list: {
      findUnique: vi.fn(),
    },
    card: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
    },
  },
  prisma: {
    board: {
      findUnique: vi.fn(),
    },
    list: {
      findUnique: vi.fn(),
    },
    card: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
    },
  },
}));

describe('RBAC Middleware (Role-Based Access Control)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFn = vi.fn();
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockReq = {
      user: undefined,
      params: { workspaceId: 'ws-123' },
    };

    const middleware = requireWorkspaceRole(Role.VIEWER);
    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Authentication required' })
    );
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('rejects non-members of the workspace with 403', async () => {
    mockReq = {
      user: { id: 'user-outsider', email: 'out@test.com', name: 'Outsider' },
      params: { workspaceId: 'ws-123' },
    };

    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

    const middleware = requireWorkspaceRole(Role.VIEWER);
    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Access denied') })
    );
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('rejects a VIEWER when the action requires MEMBER role (403)', async () => {
    mockReq = {
      user: { id: 'user-viewer', email: 'viewer@test.com', name: 'Viewer User' },
      params: { workspaceId: 'ws-123' },
    };

    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
      id: 'membership-1',
      workspaceId: 'ws-123',
      userId: 'user-viewer',
      role: Role.VIEWER,
      joinedAt: new Date(),
    });

    const middleware = requireWorkspaceRole(Role.MEMBER);
    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Requires MEMBER role, but your role is VIEWER'),
      })
    );
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('allows a MEMBER to proceed when action requires MEMBER role', async () => {
    mockReq = {
      user: { id: 'user-member', email: 'member@test.com', name: 'Member User' },
      params: { workspaceId: 'ws-123' },
    };

    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
      id: 'membership-2',
      workspaceId: 'ws-123',
      userId: 'user-member',
      role: Role.MEMBER,
      joinedAt: new Date(),
    });

    const middleware = requireWorkspaceRole(Role.MEMBER);
    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(mockReq.workspaceMember?.role).toBe(Role.MEMBER);
  });

  it('allows an OWNER to proceed on any action (hierarchical permissions)', async () => {
    mockReq = {
      user: { id: 'user-owner', email: 'owner@test.com', name: 'Owner User' },
      params: { workspaceId: 'ws-123' },
    };

    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
      id: 'membership-3',
      workspaceId: 'ws-123',
      userId: 'user-owner',
      role: Role.OWNER,
      joinedAt: new Date(),
    });

    const middleware = requireWorkspaceRole(Role.MEMBER);
    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(mockReq.workspaceMember?.role).toBe(Role.OWNER);
  });

  it('automatically resolves workspace context from boardId parameter', async () => {
    mockReq = {
      user: { id: 'user-1', email: 'u1@test.com', name: 'User 1' },
      params: { boardId: 'board-xyz' },
    };

    vi.mocked(prisma.board.findUnique).mockResolvedValue({
      workspaceId: 'ws-resolved-456',
    } as any);

    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
      id: 'mem-456',
      workspaceId: 'ws-resolved-456',
      userId: 'user-1',
      role: Role.MEMBER,
      joinedAt: new Date(),
    });

    const middleware = requireWorkspaceRole(Role.VIEWER);
    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(prisma.board.findUnique).toHaveBeenCalledWith({
      where: { id: 'board-xyz' },
      select: { workspaceId: true },
    });
    expect(nextFn).toHaveBeenCalled();
  });
});
