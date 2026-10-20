<div align="center">

# ⚡ SyncBoard
**Real-Time Collaborative Project Board with Live Sync, RBAC, and Fractional Indexing**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

SyncBoard is a production-grade Kanban project board built for modern agile teams. Every change—from dragged cards and title edits to comments and member activity—synchronizes across all online teammates instantly without page refreshes.

</div>

---

## 🎯 Key Engineering Highlights

1. **Live Synchronization via WebSockets (`Socket.IO`)**: Scoped rooms (`board:<boardId>`) with presence tracking that displays active user avatars and delivers sub-millisecond state updates.
2. **$O(1)$ Fractional Indexing**: Avoids database write locks and $O(N)$ renumbering cascades during drag-and-drop operations using midpoint fractional floats with automatic precision rebalancing.
3. **Optimistic UI with Instant Rollback**: `@dnd-kit` moves cards instantaneously in local state while asynchronously persisting to the server. If permissions fail or an error occurs, the UI seamlessly rolls back to its prior snapshot.
4. **Hierarchical Role-Based Access Control (RBAC)**: Backend-enforced role permissions (`OWNER` > `MEMBER` > `VIEWER`) across REST endpoints and WebSocket mutations.
5. **Audit Trail & Activity Log**: Real-time audit log recording every card movement, edit, and comment with relational actors and timestamps.
6. **Cross-Board "My Tasks" & Multi-Filter Search**: Instant search by keywords, priority levels, assignees, and due dates across lists and boards.
7. **CSV Export & Dark Mode**: One-click board export to CSV and responsive dark/light mode toggle.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (React 18 + TypeScript + Tailwind)"]
        UI["Kanban Board UI (@dnd-kit)"]
        BoardCtx["Board & Optimistic State Context"]
        SocketClient["Socket.IO Client (Presence & Events)"]
        UI --> BoardCtx
        BoardCtx <--> SocketClient
    end

    subgraph Server["Backend (Node.js + Express + TypeScript)"]
        AuthMid["JWT Auth & RBAC Middleware"]
        REST["REST API Controllers (/api)"]
        SocketHub["Socket.IO Server (Rooms & Presence)"]
        Services["Fractional Index Engine & DB Layer"]
        
        AuthMid --> REST
        REST --> Services
        SocketHub --> Services
    end

    subgraph Database["Database (PostgreSQL + Prisma ORM)"]
        DB[("PostgreSQL 16+
        users, workspaces, members,
        boards, lists, cards, comments,
        activity_log")]
        Services --> DB
    end

    SocketClient <==>|"WebSocket (ws://)"| SocketHub
    BoardCtx <==>|"REST (HTTP/JSON)"| REST
```

---

## 📐 Deep Dive: Fractional Indexing vs. Integer Renumbering

Traditional Kanban boards assign integer order numbers (`position = 0, 1, 2, 3...`). When an item is moved from position 10 to position 1, all items between 1 and 10 must be updated:

$$\text{Renumbering: } \text{Update } N \text{ rows } \implies O(N) \text{ database writes + write locks}$$

In a concurrent multi-user environment, this causes transaction deadlocks and frequent race conditions.

### SyncBoard's Solution
SyncBoard computes positions as fractional midpoints:

$$P_{\text{new}} = \frac{P_{\text{prev}} + P_{\text{next}}}{2}$$

- **Inserting at top**: $P_{\text{new}} = \frac{P_{\text{first}}}{2}$
- **Inserting at bottom**: $P_{\text{new}} = P_{\text{last}} + 65536$
- **Inserting between $A$ and $B$**: $P_{\text{new}} = \frac{A + B}{2}$
- **Rebalance Guard**: IEEE 754 64-bit floats provide 53 bits of mantissa (~15–17 decimal digits). If $(P_{\text{next}} - P_{\text{prev}}) < 10^{-9}$, SyncBoard automatically triggers a background rebalance with $65536$ increments.

$$\text{Fractional Indexing: } \text{Update exactly } 1 \text{ row } \implies O(1) \text{ database write}$$

---

## 🔐 Role-Based Access Control (RBAC) Matrix

| Action | `OWNER` | `MEMBER` | `VIEWER` |
|---|:---:|:---:|:---:|
| View Board, Lists, Cards, Activity | ✅ | ✅ | ✅ |
| Filter & Search Cards | ✅ | ✅ | ✅ |
| Export Board to CSV | ✅ | ✅ | ✅ |
| Move Cards (Drag-and-Drop) | ✅ | ✅ | ❌ *(Blocked + UI Rollback)* |
| Create, Edit & Delete Cards | ✅ | ✅ | ❌ |
| Create, Edit & Delete Lists | ✅ | ✅ | ❌ |
| Post & Delete Comments | ✅ | ✅ *(Own)* | ❌ |
| Invite Workspace Teammates | ✅ | ❌ | ❌ |
| Change Member Roles | ✅ | ❌ | ❌ |
| Delete Board / Workspace | ✅ | ❌ | ❌ |

---

## 🗄️ Database Schema & Composite Indexes

```mermaid
erDiagram
    USER ||--o{ WORKSPACE_MEMBER : has
    USER ||--o{ WORKSPACE : owns
    USER ||--o{ CARD : assigned
    USER ||--o{ COMMENT : writes
    USER ||--o{ ACTIVITY_LOG : triggers
    WORKSPACE ||--o{ WORKSPACE_MEMBER : contains
    WORKSPACE ||--o{ BOARD : organizes
    BOARD ||--o{ LIST : contains
    BOARD ||--o{ ACTIVITY_LOG : tracks
    LIST ||--o{ CARD : groups
    CARD ||--o{ CARD_LABEL : tagged
    CARD ||--o{ COMMENT : contains
    CARD ||--o{ ACTIVITY_LOG : references
```

### Indexed Columns for Query Optimization
- `User(email)`: Unique hash index for $O(1)$ auth lookups.
- `WorkspaceMember(workspaceId, userId)`: Unique composite index for fast RBAC validation.
- `List(boardId, position)`: Composite index for sorted list retrieval.
- `Card(listId, position)`: Composite index for ordered card rendering without full-table scans.
- `Card(assigneeId)`: B-Tree index for instantaneous "My Tasks" aggregation.
- `ActivityLog(boardId, createdAt)`: Composite index for descending pagination queries.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ and **npm** v9+
- **PostgreSQL** 14+ (or Docker)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/syncboard.git
cd syncboard
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Configure Environment Variables
Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/syncboard"
JWT_SECRET="syncboard_super_secret_jwt_key_2026"
JWT_EXPIRES_IN="7d"
CLIENT_ORIGIN="http://localhost:3000"
```

### 3. Initialize Database & Seed Demo Data
```bash
cd server
npx prisma db push
npm run db:seed
cd ..
```

### 4. Run Development Servers
From the root directory:
```bash
npm run dev
```
- **Client**: `http://localhost:3000`
- **Server API**: `http://localhost:5000/api`
- **Health Check**: `http://localhost:5000/api/health`

### 🔑 Demo Accounts (Pre-Seeded)
| Role | Email | Password |
|---|---|---|
| **Owner** | `owner@syncboard.dev` | `password123` |
| **Member** | `member@syncboard.dev` | `password123` |
| **Viewer** | `viewer@syncboard.dev` | `password123` |

---

## 🐳 Docker Setup

Run the full stack (PostgreSQL + SyncBoard server + client) with a single command:

```bash
docker compose up --build
```
Access the application at `http://localhost:5000`.

---

## 🧪 Testing

SyncBoard features comprehensive unit and integration tests using **Vitest**:
- **Fractional Indexing Algorithm Tests**: Edge cases, top/bottom insertions, midpoints, and precision threshold flags.
- **RBAC Security Middleware Tests**: Unauthenticated rejection (401), unauthorized workspace access (403), viewer permission denials, and hierarchical role inheritance.

Run all tests:
```bash
npm test
```

---

## 📄 Resume Bullets

- **"Architected a real-time collaborative Kanban board using React, TypeScript, Node.js, PostgreSQL, and Socket.IO supporting multi-user presence indicators and sub-second live state synchronization."**
- **"Engineered an $O(1)$ fractional indexing ordering algorithm for drag-and-drop card positioning, eliminating database write locks and $O(N)$ renumbering cascades across concurrent sessions."**
- **"Designed a normalized relational schema with Prisma ORM and composite B-tree indexes, securing REST endpoints via hierarchical Role-Based Access Control (RBAC) validated through Vitest integration suites."**
- **"Implemented optimistic client-side mutations with automatic rollback mechanisms, resilient WebSocket reconnection handshakes, and responsive dark-mode styling."**

---

## 📜 License
MIT License. Built with ❤️ for engineering teams.
