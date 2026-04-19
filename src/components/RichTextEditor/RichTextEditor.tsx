import { useEffect, useLayoutEffect, useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { cn } from '../../lib/ui'
import './rich-text-editor.css'

export type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Min height of the editable area (Tailwind class or arbitrary). */
  minHeightClass?: string
}

/**
 * TipTap-based HTML editor — use anywhere you need rich text (workspace description, blog, footers, etc.).
 * Stores **HTML** in `value` / `onChange`.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something…',
  disabled,
  className,
  minHeightClass = 'min-h-[160px]',
}: RichTextEditorProps) {
  /** New Extension instances every render break TipTap’s option diffing and can destroy/recreate the editor after refresh. */
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { HTMLAttributes: { class: 'list-disc pl-5' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal pl-5' } },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-violet-600 underline' },
      }),
    ],
    [placeholder],
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
  })

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [editor, disabled])

  /** Keep TipTap in sync when `value` is set asynchronously (e.g. SEO footer from API). */
  useLayoutEffect(() => {
    if (!editor) return
    const next = value ?? ''
    const current = editor.getHTML()
    if (htmlEquivalentForSync(current, next)) return
    editor.commands.setContent(next === '' ? '<p></p>' : next, { emitUpdate: false })
  }, [editor, value])

  if (!editor) {
    return (
      <div
        className={cn(
          'rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-400',
          minHeightClass,
          className,
        )}
      >
        Loading editor…
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rich-text-editor rounded-xl border border-slate-200 bg-white/90 ring-1 ring-slate-200/80',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <div className="flex flex-wrap gap-1 border-b border-slate-200/80 bg-slate-50/90 px-2 py-1.5">
        <ToolbarBtn
          label="B"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarBtn
          label="I"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarBtn
          label="H2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarBtn
          label="• List"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarBtn
          label="1. List"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarBtn
          label="Link"
          active={editor.isActive('link')}
          onClick={() => {
            const prev = editor.getAttributes('link').href
            const url = window.prompt('URL', prev ?? 'https://')
            if (url === null) return
            if (url === '') {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              return
            }
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          }}
        />
        <ToolbarBtn label="Undo" onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarBtn label="Redo" onClick={() => editor.chain().focus().redo().run()} />
      </div>
      <EditorContent
        editor={editor}
        className={cn('px-3 py-2 text-sm leading-relaxed text-slate-900', minHeightClass)}
      />
    </div>
  )
}

/** Avoid sync loops: TipTap adds trailing `<br>` / whitespace vs API HTML. */
function htmlEquivalentForSync(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .replace(/<br\s+class="ProseMirror-trailingBreak"\s*\/?>/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  if (a === b) return true
  return norm(a) === norm(b)
}

function ToolbarBtn({
  label,
  onClick,
  active,
}: {
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-2 py-1 text-xs font-semibold transition',
        active
          ? 'bg-violet-600 text-white shadow-sm'
          : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
      )}
    >
      {label}
    </button>
  )
}
