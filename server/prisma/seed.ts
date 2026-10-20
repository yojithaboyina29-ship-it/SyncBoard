import { PrismaClient, Role, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SyncBoard database...');

  // Clean existing data
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.cardLabel.deleteMany();
  await prisma.card.deleteMany();
  await prisma.list.deleteMany();
  await prisma.board.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // 1. Create Demo Users
  const alex = await prisma.user.create({
    data: {
      email: 'owner@syncboard.dev',
      name: 'Alex Rivera (Owner)',
      passwordHash,
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Alex&backgroundColor=6366f1',
    },
  });

  const ravi = await prisma.user.create({
    data: {
      email: 'member@syncboard.dev',
      name: 'Ravi Kumar (Member)',
      passwordHash,
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Ravi&backgroundColor=10b981',
    },
  });

  const sara = await prisma.user.create({
    data: {
      email: 'viewer@syncboard.dev',
      name: 'Sara Chen (Viewer)',
      passwordHash,
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Sara&backgroundColor=ec4899',
    },
  });

  // 2. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Engineering',
      slug: `acme-engineering-${Date.now().toString(36)}`,
      ownerId: alex.id,
      members: {
        create: [
          { userId: alex.id, role: Role.OWNER },
          { userId: ravi.id, role: Role.MEMBER },
          { userId: sara.id, role: Role.VIEWER },
        ],
      },
    },
  });

  // 3. Create Board
  const board = await prisma.board.create({
    data: {
      workspaceId: workspace.id,
      title: 'Sprint 14 — Core Platform',
      description: 'Q4 Product roadmap and real-time infrastructure milestones',
      color: '#6366f1',
    },
  });

  // 4. Create Lists with Fractional Ordering
  const todoList = await prisma.list.create({
    data: { boardId: board.id, title: 'To Do', position: 65536 },
  });

  const inProgressList = await prisma.list.create({
    data: { boardId: board.id, title: 'In Progress', position: 131072 },
  });

  const reviewList = await prisma.list.create({
    data: { boardId: board.id, title: 'Code Review', position: 196608 },
  });

  const doneList = await prisma.list.create({
    data: { boardId: board.id, title: 'Done', position: 262144 },
  });

  // 5. Create Cards
  const card1 = await prisma.card.create({
    data: {
      listId: todoList.id,
      title: 'Implement Fractional Indexing Engine',
      description: 'Card ordering must use O(1) midpoint calculations rather than renumbering every card row.',
      position: 65536,
      priority: Priority.HIGH,
      dueDate: new Date(Date.now() + 86400000 * 3),
      assigneeId: ravi.id,
      labels: {
        create: [
          { name: 'Backend', color: '#6366f1' },
          { name: 'Architecture', color: '#3b82f6' },
        ],
      },
    },
  });

  const card2 = await prisma.card.create({
    data: {
      listId: todoList.id,
      title: 'Dark Mode & Keyboard Shortcuts Modal',
      description: 'Support "?" for shortcuts modal, "n" for new card, and smooth dark/light transitions.',
      position: 131072,
      priority: Priority.LOW,
      dueDate: new Date(Date.now() + 86400000 * 5),
      assigneeId: sara.id,
      labels: {
        create: [{ name: 'UI/UX', color: '#ec4899' }],
      },
    },
  });

  const card3 = await prisma.card.create({
    data: {
      listId: inProgressList.id,
      title: 'Socket.IO Real-Time Board Presence',
      description: 'Broadcast active viewers via presence:update and render live avatar bubbles in the navbar.',
      position: 65536,
      priority: Priority.URGENT,
      dueDate: new Date(Date.now() + 86400000 * 1),
      assigneeId: alex.id,
      labels: {
        create: [
          { name: 'WebSockets', color: '#f59e0b' },
          { name: 'Realtime', color: '#10b981' },
        ],
      },
    },
  });

  const card4 = await prisma.card.create({
    data: {
      listId: reviewList.id,
      title: 'Role-Based Access Control Middleware',
      description: 'Ensure VIEWER role cannot modify cards or move lists. Test with Vitest integration suite.',
      position: 65536,
      priority: Priority.HIGH,
      dueDate: new Date(Date.now() + 86400000 * 2),
      assigneeId: ravi.id,
      labels: {
        create: [{ name: 'Security', color: '#ef4444' }],
      },
    },
  });

  const card5 = await prisma.card.create({
    data: {
      listId: doneList.id,
      title: 'Design PostgreSQL Relational Schema',
      description: 'Modeled workspaces, members, boards, lists, cards, comments, and audit logs with indexes.',
      position: 65536,
      priority: Priority.MEDIUM,
      assigneeId: alex.id,
      labels: {
        create: [{ name: 'Database', color: '#8b5cf6' }],
      },
    },
  });

  // 6. Comments
  await prisma.comment.createMany({
    data: [
      {
        cardId: card3.id,
        authorId: ravi.id,
        content: 'Socket handshake authenticates JWT correctly and joins board rooms seamlessly.',
      },
      {
        cardId: card3.id,
        authorId: alex.id,
        content: 'Presence avatar pulses nicely in the header now!',
      },
      {
        cardId: card1.id,
        authorId: sara.id,
        content: 'Verified unit tests for 1e-9 precision gap rebalancing.',
      },
    ],
  });

  // 7. Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        boardId: board.id,
        cardId: card5.id,
        userId: alex.id,
        action: 'CARD_MOVED',
        entityId: card5.id,
        entityType: 'CARD',
        details: JSON.stringify({
          cardTitle: card5.title,
          fromList: 'Code Review',
          toList: 'Done',
        }),
      },
      {
        boardId: board.id,
        cardId: card3.id,
        userId: alex.id,
        action: 'CARD_CREATED',
        entityId: card3.id,
        entityType: 'CARD',
        details: JSON.stringify({
          cardTitle: card3.title,
          listTitle: inProgressList.title,
        }),
      },
      {
        boardId: board.id,
        cardId: card3.id,
        userId: ravi.id,
        action: 'COMMENT_ADDED',
        entityId: card3.id,
        entityType: 'COMMENT',
        details: JSON.stringify({
          cardTitle: card3.title,
          contentPreview: 'Socket handshake authenticates JWT correctly',
        }),
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('Demo Credentials:');
  console.log('  Owner:  owner@syncboard.dev  / password123');
  console.log('  Member: member@syncboard.dev / password123');
  console.log('  Viewer: viewer@syncboard.dev / password123');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
