"use server";

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function addToWatchlist(ticker: string) {
  try {
    await prisma.watchlistItem.create({
      data: { ticker }
    });
    revalidatePath('/trading');
    revalidatePath('/watchlist');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to add to watchlist' };
  }
}

export async function removeFromWatchlist(ticker: string) {
  try {
    await prisma.watchlistItem.delete({
      where: { ticker }
    });
    revalidatePath('/trading');
    revalidatePath('/watchlist');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to remove from watchlist' };
  }
}
