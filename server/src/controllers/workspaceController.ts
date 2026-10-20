import { Request, Response } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import prisma from '../config/prisma.js';

const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

const updateRoleSchema = z.object({
  role: z.enum(['OWNER', 'MEMBER', 'VIEWER']),
});

export async function createWorkspace(req: Request, res: Response): Promise<void> {
  const { name } = createWorkspaceSchema.parse(req.body);
  const userId = req.user!.id;

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`;

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: Role.OWNER,
        },
      },
      boards: {
        create: {
          title: 'General Board',
          description: 'Main project task board',
          color: '#6366f1',
          lists: {
            create: [
              { title: 'To Do', position: 65536 },
              { title: 'In Progress', position: 131072 },
              { title: 'Done', position: 196608 },
            ],
          },
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
      boards: true,
    },
  });

  res.status(201).json({ workspace });
}

export async function getWorkspaces(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          _count: {
            select: { members: true, boards: true },
          },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  const workspaces = memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));

  res.json({ workspaces });
}

export async function getWorkspace(req: Request, res: Response): Promise<void> {
  const { workspaceId } = req.params;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
      boards: {
        orderBy: { createdAt: 'asc' },
        include: {
          _count: {
            select: { lists: true },
          },
        },
      },
    },
  });

  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  res.json({
    workspace: {
      ...workspace,
      currentUserRole: req.workspaceMember?.role,
    },
  });
}

export async function inviteMember(req: Request, res: Response): Promise<void> {
  const { workspaceId } = req.params;
  const { email, role } = inviteMemberSchema.parse(req.body);

  const targetUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!targetUser) {
    res.status(404).json({
      error: `No user with email ${email} found. Have them register on SyncBoard first.`,
    });
    return;
  }

  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUser.id,
      },
    },
  });

  if (existingMember) {
    res.status(409).json({ error: 'This user is already a member of this workspace.' });
    return;
  }

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: targetUser.id,
      role: role as Role,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  res.status(201).json({
    message: `${targetUser.name} invited successfully as ${role}.`,
    member,
  });
}

export async function updateMemberRole(req: Request, res: Response): Promise<void> {
  const { workspaceId, memberUserId } = req.params;
  const { role } = updateRoleSchema.parse(req.body);

  // If demoting an OWNER, ensure at least one other OWNER remains
  if (role !== Role.OWNER) {
    const ownerCount = await prisma.workspaceMember.count({
      where: {
        workspaceId,
        role: Role.OWNER,
      },
    });

    const targetMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
    });

    if (targetMembership?.role === Role.OWNER && ownerCount <= 1) {
      res.status(400).json({ error: 'Cannot demote the last remaining owner of the workspace.' });
      return;
    }
  }

  const updated = await prisma.workspaceMember.update({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: memberUserId,
      },
    },
    data: { role: role as Role },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  res.json({ member: updated });
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  const { workspaceId, memberUserId } = req.params;
  const currentUserId = req.user!.id;
  const currentUserRole = req.workspaceMember?.role;

  // A member can remove themselves, or an OWNER can remove any member
  if (currentUserId !== memberUserId && currentUserRole !== Role.OWNER) {
    res.status(403).json({ error: 'Only workspace owners can remove other members.' });
    return;
  }

  // Prevent leaving/removing if last owner
  const targetMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: memberUserId,
      },
    },
  });

  if (targetMembership?.role === Role.OWNER) {
    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: Role.OWNER },
    });
    if (ownerCount <= 1) {
      res.status(400).json({ error: 'The last owner cannot leave without transferring ownership.' });
      return;
    }
  }

  await prisma.workspaceMember.delete({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: memberUserId,
      },
    },
  });

  res.json({ message: 'Member removed successfully.' });
}
