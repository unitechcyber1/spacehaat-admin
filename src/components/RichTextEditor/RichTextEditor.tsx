import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import toast from 'react-hot-toast'
import { cn } from '../../lib/ui'
import { uploadAdminFile } from '../../services/upload/upload.service'
import '../RichTextEditor/rich-text-editor.css'

export type RichTextEditorMode = 'compact' | 'full'

export type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Fixed height of the editable area; content scrolls when it overflows. */
  contentHeightClass?: string
  /** @deprecated Use `contentHeightClass` */
  minHeightClass?: string
  /** `full` enables H1–H6, underline, tables, images. Default `compact` for legacy forms. */
  mode?: RichTextEditorMode
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something…',
  disabled,
  className,
  contentHeightClass,
  minHeightClass,
  mode = 'compact',
}: RichTextEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const isFull = mode === 'full'
  const resolvedHeightClass =
    contentHeightClass ??
    minHeightClass?.replace(/^min-h-/, 'h-') ??
    (isFull ? 'h-[320px]' : 'h-[200px]')

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: isFull ? [1, 2, 3, 4, 5, 6] : [2, 3] },
        bulletList: { HTMLAttributes: { class: 'list-disc pl-5' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal pl-5' } },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-violet-600 underline' },
      }),
      ...(isFull
        ? [
            Underline,
            Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-lg' } }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
          ]
        : []),
    ],
    [placeholder, isFull],
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
    if (editor) editor.setEditable(!disabled)
  }, [editor, disabled])

  useLayoutEffect(() => {
    if (!editor) return
    const next = value ?? ''
    const current = editor.getHTML()
    if (htmlEquivalentForSync(current, next)) return
    editor.commands.setContent(next === '' ? '<p></p>' : next, { emitUpdate: false })
  }, [editor, value])

  async function onImagePick(file: File) {
    if (!editor) return
    try {
      const up = (await uploadAdminFile(file)) as { s3_link?: string; id?: string }
      const src = up?.s3_link
      if (!src) {
        toast.error('Upload missing image URL')
        return
      }
      editor.chain().focus().setImage({ src, alt: file.name }).run()
    } catch (e: unknown) {
      const err = e as { message?: string }
      toast.error(err?.message ?? 'Image upload failed')
    }
  }

  if (!editor) {
    return (
      <div
        className={cn(
          'rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-400',
          resolvedHeightClass,
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
        {isFull ? (
          <ToolbarBtn
            label="U"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
        ) : null}

        {isFull ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <ToolbarBtn
                key={level}
                label={`H${level}`}
                active={editor.isActive('heading', { level: level as 1 | 2 | 3 | 4 | 5 | 6 })}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
                }
              />
            ))}
          </>
        ) : (
          <>
            <ToolbarBtn
              label="H2"
              active={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarBtn
              label="H3"
              active={editor.isActive('heading', { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            />
          </>
        )}

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

        {isFull ? (
          <>
            <ToolbarBtn
              label="Table"
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
            />
            <ToolbarBtn label="＋Row" onClick={() => editor.chain().focus().addRowAfter().run()} />
            <ToolbarBtn label="＋Col" onClick={() => editor.chain().focus().addColumnAfter().run()} />
            <ToolbarBtn
              label="Image"
              onClick={() => fileRef.current?.click()}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onImagePick(f)
                e.target.value = ''
              }}
            />
          </>
        ) : null}

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
      <div className={cn('overflow-y-auto overscroll-contain', resolvedHeightClass)}>
        <EditorContent
          editor={editor}
          className="px-3 py-2 text-sm leading-relaxed text-slate-900"
        />
      </div>
    </div>
  )
}

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
