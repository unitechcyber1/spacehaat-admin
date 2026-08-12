type IconProps = { className?: string }

const base = 'h-4 w-4'

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const BoldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 4h6a4 4 0 0 1 0 8h-6z" />
    <path d="M6.5 12h7a4 4 0 0 1 0 8h-7z" />
  </Svg>
)

export const ItalicIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 4H9.5M14.5 20H9M14 4 10 20" />
  </Svg>
)

export const UnderlineIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 4v6a5.5 5.5 0 0 0 11 0V4M5 20h14" />
  </Svg>
)

export const StrikeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h16" />
    <path d="M16.5 7.5C15.7 6 14 5 12 5c-2.5 0-4.5 1.3-4.5 3.2 0 1.5 1 2.4 2.6 3" />
    <path d="M7.5 16.4C8.4 18 10 19 12.2 19c2.6 0 4.6-1.3 4.6-3.3 0-.9-.3-1.6-1-2.2" />
  </Svg>
)

export const CodeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 17-5-5 5-5M15 7l5 5-5 5" />
  </Svg>
)

export const SuperscriptIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4 7 8 12M12 7 4 19" />
    <path d="M17.5 9V5.4c0-.5.4-.9.9-.9h1.2c.7 0 1.3.6 1.3 1.3 0 .4-.2.8-.5 1L17.6 9H21" />
  </Svg>
)

export const SubscriptIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4 5 8 12M12 5 4 17" />
    <path d="M17.5 20v-2.6c0-.5.4-.9.9-.9h1.2c.7 0 1.3.6 1.3 1.3 0 .4-.2.8-.5 1L17.6 20H21" />
  </Svg>
)

export const AlignLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />
  </Svg>
)

export const AlignCenterIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />
  </Svg>
)

export const AlignRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />
  </Svg>
)

export const AlignJustifyIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </Svg>
)

export const BulletListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
)

export const OrderedListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 6h10M10 12h10M10 18h10" />
    <path d="M4 5h1.2v3.2M3.6 12.2c0-.6.5-1 1.1-1s1.1.4 1.1 1c0 .9-2.2 1.4-2.2 2.6h2.4M3.7 16.6h2l-1.2 1.4c.7 0 1.3.4 1.3 1.1s-.6 1.1-1.3 1.1c-.5 0-1-.2-1.2-.6" />
  </Svg>
)

export const TaskListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 6h10M10 12h10M10 18h10" />
    <path d="m3 6 1.4 1.4L7 4.8M3 12l1.4 1.4L7 10.8M3 18l1.4 1.4L7 16.8" />
  </Svg>
)

export const IndentIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 6h10M10 12h10M10 18h10M4 4h1M3 9l3 3-3 3" />
  </Svg>
)

export const OutdentIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 6h10M10 12h10M10 18h10M6 9l-3 3 3 3" />
  </Svg>
)

export const LinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.3-1.3" />
  </Svg>
)

export const UnlinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 8.5l1.4-1.4a4 4 0 0 1 5.7 5.7l-2 2M9 15.5 7.6 17a4 4 0 0 1-5.7-5.7l2-2" />
    <path d="M3 3l18 18" />
  </Svg>
)

export const ImageIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <circle cx="8.5" cy="10" r="1.6" />
    <path d="m4 17 4.5-4.5 3.5 3.5 3-3L20 17" />
  </Svg>
)

export const TableIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <path d="M3 9.5h18M3 14.5h18M9 4.5v15M15 4.5v15" />
  </Svg>
)

export const QuoteIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 7H5.5A1.5 1.5 0 0 0 4 8.5V12h5V7zM9 12c0 3-1.5 4.5-4 5M20 7h-3.5A1.5 1.5 0 0 0 15 8.5V12h5V7zm0 5c0 3-1.5 4.5-4 5" />
  </Svg>
)

export const CodeBlockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <path d="m9.5 10-2 2 2 2M14.5 10l2 2-2 2" />
  </Svg>
)

export const HorizontalRuleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h16M6 7h12M6 17h12" opacity={0.9} />
  </Svg>
)

export const UndoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9h10a5 5 0 0 1 0 10h-3" />
    <path d="m7.5 5.5-3.5 3.5 3.5 3.5" />
  </Svg>
)

export const RedoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 9H10a5 5 0 0 0 0 10h3" />
    <path d="m16.5 5.5 3.5 3.5-3.5 3.5" />
  </Svg>
)

export const ClearFormatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 6h13M11 6 8.5 19M15 13l5 5M20 13l-5 5" />
  </Svg>
)

export const PaletteIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21a9 9 0 1 1 9-9c0 2-1.6 3-3.2 3H16a2 2 0 0 0-1.4 3.4c.3.3.4.7.4 1.1 0 .8-.7 1.5-3 1.5Z" />
    <circle cx="7.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="9.8" cy="8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="14.2" cy="8" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
)

export const HighlightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m13 5 6 6-7 7H8l-2-2 7-11Z" />
    <path d="M4 21h16" />
  </Svg>
)

export const SourceIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
  </Svg>
)

export const FullscreenIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </Svg>
)

export const ExitFullscreenIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </Svg>
)

export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)
