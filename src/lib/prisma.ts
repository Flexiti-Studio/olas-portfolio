import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Resilient query wrapper that automatically reconnects and retries on transient pooler / network disconnects (P1001, P1002, socket resets)
 */
export async function withPrismaRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempts = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      attempts++;
      const errorCode = error?.code;
      const errorMessage = error?.message || '';
      const isConnectionError =
        errorCode === 'P1001' || // Can't reach database server
        errorCode === 'P1002' || // Database server timed out
        errorCode === 'P1008' || // Operations timed out
        errorCode === 'P1017' || // Server closed the connection
        errorCode === 'P2024' || // Timed out fetching a new connection from pool
        errorCode === 'P2028' || // Transaction already closed
        errorMessage.includes("Can't reach database server") ||
        errorMessage.includes('Connection lost') ||
        errorMessage.includes('Connection terminated') ||
        errorMessage.includes('Socket closed') ||
        errorMessage.includes('timed out') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('EAI_AGAIN');

      if (isConnectionError && attempts <= maxRetries) {
        const delay = Math.min(800 * attempts, 3000);
        console.warn(`[Prisma] Transient connection error detected (${errorCode || 'NETWORK'}). Reconnecting (attempt ${attempts}/${maxRetries}) in ${delay}ms...`);
        try {
          await prisma.$disconnect();
          await prisma.$connect();
        } catch (reconnectErr) {
          console.warn('[Prisma] Reconnect attempt failed:', reconnectErr);
        }
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      throw error;
    }
  }
}
