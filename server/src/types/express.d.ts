import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
      workspaceMember?: {
        id: string;
        role: Role;
        workspaceId: string;
        userId: string;
      };
    }
  }
}
