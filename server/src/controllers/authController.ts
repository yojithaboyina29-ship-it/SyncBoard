import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { ENV } from '../config/env.js';
import { Role } from '@prisma/client';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function generateToken(userId: string, email: string, name: string): string {
  return jwt.sign({ userId, email, name }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN as any,
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name } = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=6366f1,4f46e5,3b82f6`,
    },
  });

  // Automatically create a starter workspace for the new user
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-workspace-${Date.now().toString(36)}`;
  const workspace = await prisma.workspace.create({
    data: {
      name: `${name}'s Workspace`,
      slug,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: Role.OWNER,
        },
      },
      boards: {
        create: {
          title: 'Project Roadmap',
          description: 'Default starter project board with live synchronization',
          color: '#6366f1',
          lists: {
            create: [
              {
                title: 'To Do',
                position: 65536,
                cards: {
                  create: [
                    {
                      title: 'Welcome to SyncBoard! 👋',
                      description: 'Try dragging this card to another list, or invite a teammate to see real-time updates.',
                      position: 65536,
                      priority: 'HIGH',
                    },
                    {
                      title: 'Explore Fractional Indexing 📐',
                      description: 'Cards use fractional indexing for O(1) order updates without renumbering everything.',
                      position: 131072,
                      priority: 'MEDIUM',
                    },
                  ],
                },
              },
              {
                title: 'In Progress',
                position: 131072,
                cards: {
                  create: [
                    {
                      title: 'Collaborate live with your team 🚀',
                      description: 'Presence avatars in the top right will show anyone viewing this board.',
                      position: 65536,
                      priority: 'URGENT',
                    },
                  ],
                },
              },
              {
                title: 'Review',
                position: 196608,
              },
              {
                title: 'Done',
                position: 262144,
                cards: {
                  create: [
                    {
                      title: 'Set up SyncBoard workspace ✨',
                      description: 'Your workspace has been successfully initialized.',
                      position: 65536,
                      priority: 'LOW',
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
    include: {
      boards: true,
    },
  });

  const token = generateToken(user.id, user.email, user.name);

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    workspace,
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = generateToken(user.id, user.email, user.name);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
      memberships: {
        include: {
          workspace: {
            include: {
              _count: {
                select: { members: true, boards: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
}
