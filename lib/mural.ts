import prisma from "@/lib/prisma";

export const MURAL_PRIORITIES = ["NORMAL", "IMPORTANT", "URGENT"] as const;
export type MuralPriority = (typeof MURAL_PRIORITIES)[number];

export const EVENT_CATEGORIES = ["EVENTO", "REUNIAO", "FERIADO", "INTEGRACAO"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/**
 * Remove fisicamente do banco de dados todas as comunicações do mural
 * cujo tempo ativo (`expiresAt`) já expirou.
 */
export async function cleanupExpiredMuralPosts(): Promise<number> {
  const result = await prisma.muralPost.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  });
  return result.count;
}

/**
 * Converte uma string YYYY-MM-DD em Date UTC ao meio-dia para evitar
 * deslocamento de dia por fuso horário (ex: UTC-3).
 */
export function parseUtcNoonDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}
