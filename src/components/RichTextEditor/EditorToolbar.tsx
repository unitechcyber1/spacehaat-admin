import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { cn } from '../../lib/ui'
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  BulletListIcon,
  ChevronDownIcon,
  ClearFormatIcon,
  CodeBlockIcon,
  CodeIcon,
  ExitFullscreenIcon,
  FullscreenIcon,
  HighlightIcon,
  HorizontalRuleIcon,
  ImageIcon,
  IndentIcon,
  ItalicIcon,
  LinkIcon,
  OrderedListIcon,
  OutdentIcon,
  PaletteIcon,
  QuoteIcon,
  RedoIcon,
  SourceIcon,
  StrikeIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TableIcon,
  TaskListIcon,
  UndoIcon,
  UnderlineIcon,
  UnlinkIcon,
} from './EditorIcons'

const TEXT_COLORS = [
  '#0f172a', '#334155', '#64748b', '#94a3b8',
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
  '#0891b2', '#2563eb', '#7c3aed', '#db2777',
]

const HIGHLIGHT_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff',
  '#fecaca', '#fed7aa', '#cffafe', '#f1f5f9',
]

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const

export type EditorToolbarProps = {
  editor: Editor
  full: boolean
  sourceMode: boolean
  fullscreen: boolean
  onToggleSource: () => void
  onToggleFullscreen: () => void
  onOpenLink: () => void
  onOpenImage: () => void
  onOpenTable: () => void
}

export function EditorToolbar({
  editor,
  full,
  sourceMode,
  fullscreen,
  onToggleSource,
  onToggleFullscreen,
  onOpenLink,
  onOpenImage,
  onOpenTable,
}: EditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive('bold'),
      italic: ed.isActive('italic'),
      underline: ed.isActive('underline'),
      strike: ed.isActive('strike'),
      code: ed.isActive('code'),
      superscript: ed.isActive('superscript'),
      subscript: ed.isActive('subscript'),
      bulletList: ed.isActive('bulletList'),
      orderedList: ed.isActive('orderedList'),
      taskList: ed.isActive('taskList'),
      link: ed.isActive('link'),
      blockquote: ed.isActive('blockquote'),
      codeBlock: ed.isActive('codeBlock'),
      inTable: ed.isActive('table'),
      alignLeft: ed.isActive({ textAlign: 'left' }),
      alignCenter: ed.isActive({ textAlign: 'center' }),
      alignRight: ed.isActive({ textAlign: 'right' }),
      alignJustify: ed.isActive({ textAlign: 'justify' }),
      paragraph: ed.isActive('paragraph'),
      headingLevel: activeHeadingLevel(ed),
      color: (ed.getAttributes('textStyle')?.color as string | undefined) ?? '',
      canUndo: ed.can().undo(),
      canRedo: ed.can().redo(),
      inList: ed.isActive('listItem') || ed.isActive('taskItem'),
    }),
  })

  const disabled = sourceMode
  const headingLevels = full ? HEADING_LEVELS : ([2, 3] as const)

  return (
    <div className="sticky top-0 z-20 flex flex-col gap-1 rounded-t-xl border-b border-slate-200/80 bg-slate-50/95 px-2 py-1.5 backdrop-blur">
      <div className="flex flex-wrap items-center gap-1">
        <TextBtn
          label="Paragraph"
          active={state?.paragraph}
          disabled={disabled}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          P
        </TextBtn>
        {headingLevels.map((level) => (
          <TextBtn
            key={level}
            label={`Heading ${level}`}
            active={state?.headingLevel === level}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          >
            H{level}
          </TextBtn>
        ))}

        <Divider />

        <Btn
          label="Bold"
          shortcut="⌘B"
          active={state?.bold}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon />
        </Btn>
        <Btn
          label="Italic"
          shortcut="⌘I"
          active={state?.italic}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon />
        </Btn>
        <Btn
          label="Underline"
          shortcut="⌘U"
          active={state?.underline}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </Btn>
        <Btn
          label="Strikethrough"
          active={state?.strike}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <StrikeIcon />
        </Btn>
        <Btn
          label="Inline code"
          active={state?.code}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <CodeIcon />
        </Btn>

        {full ? (
          <>
            <Btn
              label="Superscript"
              active={state?.superscript}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
            >
              <SuperscriptIcon />
            </Btn>
            <Btn
              label="Subscript"
              active={state?.subscript}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleSubscript().run()}
            >
              <SubscriptIcon />
            </Btn>

            <Divider />

            <ColorPopover
              label="Text colour"
              icon={<PaletteIcon />}
              colors={TEXT_COLORS}
              current={state?.color}
              disabled={disabled}
              onPick={(c) => editor.chain().focus().setColor(c).run()}
              onClear={() => editor.chain().focus().unsetColor().run()}
            />
            <ColorPopover
              label="Highlight"
              icon={<HighlightIcon />}
              colors={HIGHLIGHT_COLORS}
              disabled={disabled}
              onPick={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
              onClear={() => editor.chain().focus().unsetHighlight().run()}
            />

            <Divider />

            <Btn
              label="Align left"
              active={state?.alignLeft}
              disabled={disabled}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
            >
              <AlignLeftIcon />
            </Btn>
            <Btn
              label="Align centre"
              active={state?.alignCenter}
              disabled={disabled}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenterIcon />
            </Btn>
            <Btn
              label="Align right"
              active={state?.alignRight}
              disabled={disabled}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
              <AlignRightIcon />
            </Btn>
            <Btn
              label="Justify"
              active={state?.alignJustify}
              disabled={disabled}
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            >
              <AlignJustifyIcon />
            </Btn>
          </>
        ) : null}

        <Divider />

        <Btn
          label="Bullet list"
          active={state?.bulletList}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <BulletListIcon />
        </Btn>
        <Btn
          label="Numbered list"
          active={state?.orderedList}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <OrderedListIcon />
        </Btn>

        {full ? (
          <>
            <Btn
              label="Checklist"
              active={state?.taskList}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            >
              <TaskListIcon />
            </Btn>
            <Btn
              label="Indent"
              disabled={disabled || !state?.inList}
              onClick={() =>
                editor.isActive('taskItem')
                  ? editor.chain().focus().sinkListItem('taskItem').run()
                  : editor.chain().focus().sinkListItem('listItem').run()
              }
            >
              <IndentIcon />
            </Btn>
            <Btn
              label="Outdent"
              disabled={disabled || !state?.inList}
              onClick={() =>
                editor.isActive('taskItem')
                  ? editor.chain().focus().liftListItem('taskItem').run()
                  : editor.chain().focus().liftListItem('listItem').run()
              }
            >
              <OutdentIcon />
            </Btn>
          </>
        ) : null}

        <Divider />

        <Btn label="Insert link" shortcut="⌘K" active={state?.link} disabled={disabled} onClick={onOpenLink}>
          <LinkIcon />
        </Btn>
        <Btn
          label="Remove link"
          disabled={disabled || !state?.link}
          onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
        >
          <UnlinkIcon />
        </Btn>

        {full ? (
          <>
            <Btn label="Insert image" disabled={disabled} onClick={onOpenImage}>
              <ImageIcon />
            </Btn>
            <Btn label="Insert table" disabled={disabled} onClick={onOpenTable}>
              <TableIcon />
            </Btn>
            <Btn
              label="Quote"
              active={state?.blockquote}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <QuoteIcon />
            </Btn>
            <Btn
              label="Code block"
              active={state?.codeBlock}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              <CodeBlockIcon />
            </Btn>
            <Btn
              label="Divider"
              disabled={disabled}
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <HorizontalRuleIcon />
            </Btn>
          </>
        ) : null}

        <Divider />

        <Btn
          label="Clear formatting"
          disabled={disabled}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <ClearFormatIcon />
        </Btn>
        <Btn
          label="Undo"
          shortcut="⌘Z"
          disabled={disabled || !state?.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <UndoIcon />
        </Btn>
        <Btn
          label="Redo"
          shortcut="⇧⌘Z"
          disabled={disabled || !state?.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <RedoIcon />
        </Btn>

        {full ? (
          <>
            <Divider />
            <Btn label={sourceMode ? 'Rich text' : 'HTML source'} active={sourceMode} onClick={onToggleSource}>
              <SourceIcon />
            </Btn>
            <Btn label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={onToggleFullscreen}>
              {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </Btn>
          </>
        ) : null}
      </div>

      {full && state?.inTable && !sourceMode ? (
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-200/70 pt-1">
          <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Table</span>
          <MiniBtn onClick={() => editor.chain().focus().addRowBefore().run()}>Row above</MiniBtn>
          <MiniBtn onClick={() => editor.chain().focus().addRowAfter().run()}>Row below</MiniBtn>
          <MiniBtn onClick={() => editor.chain().focus().deleteRow().run()}>Delete row</MiniBtn>
          <MiniBtn onClick={() => editor.chain().focus().addColumnBefore().run()}>Col left</MiniBtn>
          <MiniBtn onClick={() => editor.chain().focus().addColumnAfter().run()}>Col right</MiniBtn>
          <MiniBtn onClick={() => editor.chain().focus().deleteColumn().run()}>Delete col</MiniBtn>
          <MiniBtn onClick={() => editor.chain().focus().toggleHeaderRow().run()}>Header row</MiniBtn>
          <MiniBtn onClick={() => editor.chain().focus().toggleHeaderColumn().run()}>Header col</MiniBtn>
          <MiniBtn onClick={() => editor.chain().focus().mergeOrSplit().run()}>Merge / split</MiniBtn>
          <MiniBtn danger onClick={() => editor.chain().focus().deleteTable().run()}>
            Delete table
          </MiniBtn>
        </div>
      ) : null}
    </div>
  )
}

function activeHeadingLevel(ed: Editor): number | null {
  for (const level of HEADING_LEVELS) {
    if (ed.isActive('heading', { level })) return level
  }
  return null
}

function Divider() {
  return <span className="mx-0.5 h-6 w-px self-center bg-slate-300/80" aria-hidden />
}

function Btn({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg transition',
        'disabled:pointer-events-none disabled:opacity-40',
        active
          ? 'bg-violet-600 text-white shadow-sm'
          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-900',
      )}
    >
      {children}
    </button>
  )
}

/** Toolbar button with a text label (P, H1…H6) rather than an icon. */
function TextBtn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-xs font-semibold transition',
        'disabled:pointer-events-none disabled:opacity-40',
        active
          ? 'bg-violet-600 text-white shadow-sm'
          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-900',
      )}
    >
      {children}
    </button>
  )
}

function MiniBtn({
  onClick,
  danger,
  children,
}: {
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg bg-white px-2 py-1 text-[11px] font-medium ring-1 ring-slate-200 transition hover:bg-slate-100',
        danger ? 'text-rose-700 hover:bg-rose-50' : 'text-slate-700',
      )}
    >
      {children}
    </button>
  )
}

function ColorPopover({
  label,
  icon,
  colors,
  current,
  disabled,
  onPick,
  onClear,
}: {
  label: string
  icon: React.ReactNode
  colors: string[]
  current?: string
  disabled?: boolean
  onPick: (color: string) => void
  onClear: () => void
}) {
  return (
    <Popover className="relative">
      <PopoverButton
        title={label}
        aria-label={label}
        disabled={disabled}
        className={cn(
          'inline-flex h-8 items-center justify-center gap-0.5 rounded-lg bg-white px-1.5 text-slate-600 ring-1 ring-slate-200 transition',
          'hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40',
          'data-[open]:bg-violet-600 data-[open]:text-white data-[open]:ring-violet-600',
        )}
      >
        {icon}
        <ChevronDownIcon className="h-3 w-3" />
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        className="z-[100] mt-1 w-56 rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200/80"
      >
        {({ close }) => (
          <>
            <div className="grid grid-cols-6 gap-1.5">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => {
                    onPick(c)
                    close()
                  }}
                  className={cn(
                    'h-6 w-6 rounded-md ring-1 ring-slate-300 transition hover:scale-110',
                    current === c && 'ring-2 ring-violet-600',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="color"
                aria-label={`${label} custom`}
                className="h-7 w-9 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                onChange={(e) => onPick(e.target.value)}
              />
              <button
                type="button"
                className="flex-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                onClick={() => {
                  onClear()
                  close()
                }}
              >
                Remove
              </button>
            </div>
          </>
        )}
      </PopoverPanel>
    </Popover>
  )
}
