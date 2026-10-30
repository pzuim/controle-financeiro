import type { CategoryIcon } from '../domain/types';

/** Ícones próprios, desenhados em traço (24×24). */
const PATHS = {
  card: 'M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5zM3 9.5h18M7 15.5h4',
  summary: 'M12 3a9 9 0 1 0 9 9h-9zM15 3.4A9 9 0 0 1 20.6 9H15z',
  bars: 'M4 6h11M4 12h16M4 18h7',
  settings:
    'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-2 1.2l-.3 2h-4l-.3-2a7.6 7.6 0 0 1-2-1.2l-1.9.7-2-3.4 1.6-1.2a7.7 7.7 0 0 1 0-3L2.6 9.3l2-3.4 1.9.7a7.6 7.6 0 0 1 2-1.2l.3-2h4l.3 2a7.6 7.6 0 0 1 2 1.2l1.9-.7 2 3.4-1.6 1.2a7.7 7.7 0 0 1 0 3z',
  history: 'M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v4.5H8M12 7.5V12l3 2',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  income: 'M4 17l6-6 4 4 6-6M14 9h6v6',
  chevronLeft: 'M14.5 6l-6 6 6 6',
  chevronRight: 'M9.5 6l6 6-6 6',
  chevronDown: 'M6 9.5l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4zM16 16l4.5 4.5',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 15V4M7 9l5-5 5 5M5 20h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 3l9.5 17h-19zM12 10v4.5M12 17.5v.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.8v.01',
  device: 'M8 2.5h8A1.5 1.5 0 0 1 17.5 4v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5zM11 18.5h2',
  restore: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z',
  eyeOff: 'M3 3l18 18M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.6M6.6 6.7C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 4.6-1.2M9.9 9.9a2.8 2.8 0 0 0 4.2 4.2',
  calendar: 'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM4 10h16M8.5 3v4M15.5 3v4',
  wallet: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.5v10A2.5 2.5 0 0 0 6.5 20H20v-12H6.5A2.5 2.5 0 0 1 4 7.5zM16 14h.01',
  // Categorias
  food: 'M7 3v7.5M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 10.5V21M17.5 21V3c-2.3 1.2-3.5 4-3.5 7.5V13h3.5',
  transport: 'M5 16.5V12l1.7-4.6A2 2 0 0 1 8.6 6h6.8a2 2 0 0 1 1.9 1.4L19 12v4.5zM5 12h14M7.5 16.5V19M16.5 16.5V19M8 14.2h.01M16 14.2h.01',
  leisure: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7v1.5M14 11v2M14 15.5V17',
  sport: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.7 5.6c3.4 3.5 3.4 9.3 0 12.8M18.3 5.6c-3.4 3.5-3.4 9.3 0 12.8',
  health: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20zM8 12h2.2l1.3-2 1.6 4 1.2-2H16',
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5.5h4V20',
  subscription: 'M17 3l3 3-3 3M4 11V9.5A3.5 3.5 0 0 1 7.5 6H20M7 21l-3-3 3-3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H4',
  shopping: 'M5.5 8h13l-1.1 11.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8zM9 10V7a3 3 0 0 1 6 0v3',
  education: 'M3 9l9-4.5L21 9l-9 4.5zM7 11v4.5c0 1.4 2.2 3 5 3s5-1.6 5-3V11M21 9v5',
  other: 'M6 12h.01M12 12h.01M18 12h.01',
  tag: 'M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8L21 12.2 12.2 21zM8 8h.01',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  class?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, class: className, strokeWidth }: IconProps) {
  const dots = name === 'other';
  return (
    <svg
      class={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={strokeWidth ?? (dots ? 3.2 : 1.8)}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

// Garante em tempo de compilação que todo ícone de categoria existe.
export const categoryIcon = (icon: CategoryIcon): IconName => icon;
