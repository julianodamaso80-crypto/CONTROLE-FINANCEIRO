import { UserRole } from '@prisma/client';

export interface RequestUser {
  userId: string;
  companyId: string;
  role: UserRole;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}
