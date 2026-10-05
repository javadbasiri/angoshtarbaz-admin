export type AdminUser = {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SessionResponse = {
  authenticated: boolean;
  user: AdminUser | null;
};
