/** Minúsculas e sem acentos, para buscas e comparações ("Café" = "cafe"). */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/** Descrições usadas recentemente (a mais recente primeiro), sem repetição. */
export function recentDistinct<T extends { description: string; createdAt: string }>(items: T[], limit: number): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const key = normalize(item.description);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
