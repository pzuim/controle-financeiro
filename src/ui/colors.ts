function channels(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Luminância relativa (WCAG 2). */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Texto branco em cartões escuros/saturados; texto escuro em cores claras (ex.: amarelo). */
export function cardTextColor(color: string, color2: string): string {
  const avg = (luminance(color) + luminance(color2)) / 2;
  return avg > 0.45 ? '#17181A' : '#FFFFFF';
}

/** Escurece a cor até o texto branco ter contraste mínimo de 4,5:1 (botões). */
export function accessibleAccent(hex: string): string {
  let rgb = channels(hex);
  for (let i = 0; i < 30 && contrast(toHex(rgb), '#FFFFFF') < 4.5; i++) {
    rgb = rgb.map((c) => c * 0.93) as [number, number, number];
  }
  return toHex(rgb);
}

export function cardGradient(color: string, color2: string): string {
  return `linear-gradient(135deg, ${color} 0%, ${color2} 100%)`;
}

export const COLOR_PRESETS: ReadonlyArray<{ name: string; color: string; color2: string }> = [
  { name: 'Laranja', color: '#FF7A00', color2: '#F2520A' },
  { name: 'Rosa', color: '#FF3D81', color2: '#FF6A3D' },
  { name: 'Grafite', color: '#3A3D42', color2: '#16171A' },
  { name: 'Azul', color: '#2F6BFF', color2: '#1B3FB8' },
  { name: 'Roxo', color: '#8B4DFF', color2: '#5126C9' },
  { name: 'Verde', color: '#14A06B', color2: '#0B6E4F' },
  { name: 'Vinho', color: '#B3264D', color2: '#6E1530' },
  { name: 'Dourado', color: '#E6B54A', color2: '#B9862A' },
];
