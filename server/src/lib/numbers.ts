import { Prisma } from '@prisma/client';

let lastStamp = 0;

/**
 * Millisecond timestamp for human-facing numbers (ORD-…, INV-…, PR-…).
 * Never hands out the same value twice in this process, so requests in the
 * same millisecond still get distinct numbers. Keeps the 13-digit shape the
 * printed receipts and courier barcodes are sized for.
 */
function uniqueStamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

/** Six random digits, as used in tracking codes (AKS-BD-123456). */
function randomDigits(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export interface GeneratedNumbers {
  /** Unique millisecond stamp to put after a prefix. */
  stamp: number;
  /** Six random digits for a tracking code. */
  digits: string;
}

/**
 * Run a create that writes generated unique numbers, regenerating them and
 * retrying if one collides with an existing row (another process, a restart,
 * or a random tracking code that was already taken).
 */
export async function createWithUniqueNumbers<T>(
  create: (n: GeneratedNumbers) => Promise<T>,
  attempts = 5
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await create({ stamp: uniqueStamp(), digits: randomDigits() });
    } catch (err) {
      const collided = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
      if (!collided || attempt >= attempts) throw err;
    }
  }
}
