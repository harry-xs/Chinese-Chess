import type { SVGProps } from 'react';

export type IconName =
  | 'chevron-left'
  | 'more'
  | 'undo'
  | 'hint'
  | 'list'
  | 'check'
  | 'close'
  | 'volume-on'
  | 'volume-off'
  | 'flag'
  | 'draw'
  | 'refresh';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  };

  switch (name) {
    case 'chevron-left':
      return (
        <svg {...common}>
          <path d="M15 5 8 12l7 7" />
        </svg>
      );
    case 'more':
      return (
        <svg {...common} stroke="none" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      );
    case 'undo':
      return (
        <svg {...common}>
          <path d="M9 7H4v-5" transform="translate(0 1)" />
          <path d="M4.5 8a8 8 0 1 0 3-6.2" />
        </svg>
      );
    case 'hint':
      return (
        <svg {...common}>
          <path d="M9.5 17h5" />
          <path d="M10 20h4" />
          <path d="M12 3a5.5 5.5 0 0 1 3.2 9.97c-.5.4-.7 1.03-.7 1.53v.5H9v-.5c0-.5-.2-1.13-.7-1.53A5.5 5.5 0 0 1 12 3Z" />
        </svg>
      );
    case 'list':
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12.5 4.5 4.5L19 7" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case 'volume-on':
      return (
        <svg {...common}>
          <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4Z" />
          <path d="M16 9.5a3.5 3.5 0 0 1 0 5" />
          <path d="M18.5 7a7 7 0 0 1 0 10" />
        </svg>
      );
    case 'volume-off':
      return (
        <svg {...common}>
          <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4Z" />
          <path d="m16.5 9.5 5 5M21.5 9.5l-5 5" />
        </svg>
      );
    case 'flag':
      return (
        <svg {...common}>
          <path d="M6 21V4" />
          <path d="M6 4h11l-2 3.5L17 11H6" />
        </svg>
      );
    case 'draw':
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />
          <path d="M8 10h8M8 14h8" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 12a8 8 0 1 1-2.34-5.66" />
          <path d="M20 4v4h-4" />
        </svg>
      );
    default:
      return null;
  }
}
