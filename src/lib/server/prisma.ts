/**
 * Prisma client — lazy-initialized to avoid build-time errors.
 *
 * During `next build` (static analysis / page-data collection), Prisma may
 * not yet be generated or DATABASE_URL may be unavailable.  By deferring
 * instantiation behind a getter we ensure the module can be imported safely
 * at build time and only connects when actually called at runtime.
 */

import type { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let _prisma: PrismaClient | undefined;

/**
 * Return a lazily-created PrismaClient singleton.
 * Safe to call at runtime; never throws at import/build time.
 */
export function getPrisma(): PrismaClient {
  if (!_prisma) {
    // Re-require inside the getter so webpack doesn't eagerly evaluate it
    // during `next build` page-data collection.
    const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
    _prisma = globalForPrisma.prisma ?? new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _prisma;
  }
  return _prisma;
}

/**
 * Convenience alias — still lazy via the getter.
 * Existing code that does `import { prisma } from '@/lib/server/prisma'`
 * will call the getter each time it accesses `.prisma`.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getPrisma(), prop);
  },
});
