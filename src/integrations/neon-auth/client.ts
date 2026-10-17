'use client';

import { createAuthClient } from '@neondatabase/auth/next';

/** Client auth API. Authorization decisions remain server-side. */
export const neonAuthClient = createAuthClient();
