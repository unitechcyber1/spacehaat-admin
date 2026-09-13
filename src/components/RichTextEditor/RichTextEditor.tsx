import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import toast from 'react-hot-toast'
import { cn } from '../../lib/ui'
import { uploadAdminFile } from '../../services/upload/upload.service'
import { buildExtensions } from './editorExtensions'
import { EditorToolbar } from './EditorToolbar'
import { ImageDialog, LinkDialog, TableDialog, type ImageValue, type LinkValue } from './EditorDialogs'
import './rich-text-editor.css'

export type RichTextEditorMode = 'compact' | 'full'

const EMPTY_LINK: LinkValue = { href: '', text: '', newTab: false, nofollow: false, sponsored: false }
const EMPTY_IMAGE: ImageValue = { src: '', alt: '', title: '', width: '', align: '' }

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
  /** `full` enables headings H1–H6, colours, alignment, tables, images, source view. */
  mode?: RichTextEditorMode
  /** Show the word count / SEO hint bar (full mode only). Defaults to true. */
  showStatusBar?: boolean
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
  showStatusBar = true,
}: RichTextEditorProps) {
  const isFull = mode === 'full'
  const resolvedHeightClass =
    contentHeightClass ??
    minHeightClass?.replace(/^min-h-/, 'h-') ??
    (isFull ? 'h-[420px]' : 'h-[200px]')

  const [sourceMode, setSourceMode] = useState(false)
  const [sourceDraft, setSourceDraft] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkInitial, setLinkInitial] = useState<LinkValue>(EMPTY_LINK)
  const [imageOpen, setImageOpen] = useState(false)
  const [imageInitial, setImageInitial] = useState<ImageValue>(EMPTY_IMAGE)
  const [tableOpen, setTableOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const extensions = useMemo(
    () => buildExtensions({ placeholder, full: isFull }),
    [placeholder, isFull],
  )

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      const up = (await uploadAdminFile(file)) as { s3_link?: string; id?: string }
      if (!up?.s3_link) {
        toast.error('Upload did not return an image URL')
        return null
      }
      return up.s3_link
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Image upload failed')
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: { class: 'rte-content' },
      handlePaste: (view, event) => {
        if (!isFull) return false
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith('image/'),
        )
        if (files.length === 0) return false
        event.preventDefault()
        void (async () => {
          for (const file of files) {
            const src = await uploadImage(file)
            if (src) {
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src, alt: '', loading: 'lazy' }),
                ),
              )
            }
          }
        })()
        return true
      },
      handleDrop: (view, event) => {
        if (!isFull) return false
        const dt = (event as DragEvent).dataTransfer
        const files = Array.from(dt?.files ?? []).filter((f) => f.type.startsWith('image/'))
        if (files.length === 0) return false
        event.preventDefault()
        const coords = view.posAtCoords({
          left: (event as DragEvent).clientX,
          top: (event as DragEvent).clientY,
        })
        void (async () => {
          for (const file of files) {
            const src = await uploadImage(file)
            if (!src) continue
            const node = view.state.schema.nodes.image.create({ src, alt: '', loading: 'lazy' })
            const pos = coords?.pos ?? view.state.selection.from
            view.dispatch(view.state.tr.insert(pos, node))
          }
        })()
        return true
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChangeRef.current(ed.getHTML())
    },
  })

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [editor, disabled])

  useLayoutEffect(() => {
    if (!editor || sourceMode) return
    const next = value ?? ''
    const current = editor.getHTML()
    if (htmlEquivalentForSync(current, next)) return
    editor.commands.setContent(next === '' ? '<p></p>' : next, { emitUpdate: false })
  }, [editor, value, sourceMode])

  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen])

  function toggleSource() {
    if (!editor) return
    if (sourceMode) {
      editor.commands.setContent(sourceDraft || '<p></p>', { emitUpdate: false })
      onChangeRef.current(editor.getHTML())
      setSourceMode(false)
      return
    }
    setSourceDraft(formatHtml(editor.getHTML()))
    setSourceMode(true)
  }

  function openLinkDialog() {
    if (!editor) return
    const attrs = editor.getAttributes('link') as { href?: string; target?: string; rel?: string }
    const rel = attrs.rel ?? ''
    setLinkInitial({
      href: attrs.href ?? '',
      text: '',
      newTab: attrs.target === '_blank',
      nofollow: rel.includes('nofollow'),
      sponsored: rel.includes('sponsored'),
    })
    setLinkOpen(true)
  }

  function openImageDialog() {
    if (!editor) return
    const attrs = editor.getAttributes('image') as Record<string, string | undefined>
    setImageInitial({
      src: attrs.src ?? '',
      alt: attrs.alt ?? '',
      title: attrs.title ?? '',
      width: attrs.width ?? '',
      align: (attrs.align as ImageValue['align']) ?? '',
    })
    setImageOpen(true)
  }

  function applyLink(v: LinkValue) {
    if (!editor) return
    const rel = [
      'noopener',
      'noreferrer',
      v.nofollow ? 'nofollow' : '',
      v.sponsored ? 'sponsored' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const attrs = { href: v.href.trim(), target: v.newTab ? '_blank' : null, rel }
    const { empty } = editor.state.selection
    if (empty && v.text.trim()) {
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text: v.text.trim(), marks: [{ type: 'link', attrs }] })
        .run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink(attrs).run()
    }
    setLinkOpen(false)
  }

  function applyImage(v: ImageValue) {
    if (!editor) return
    editor
      .chain()
      .focus()
      .setImage({
        src: v.src.trim(),
        alt: v.alt.trim(),
        title: v.title.trim() || null,
        width: v.width.trim() || null,
        align: v.align || null,
        loading: 'lazy',
      } as never)
      .run()
    setImageOpen(false)
  }

  if (!editor) {
    return (
      <div
        className={cn(
          'rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm text-slate-400',
          resolvedHeightClass,
          className,
        )}
      >
        Loading editor…
      </div>
    )
  }

  const shell = (
    <div
      className={cn(
        'rich-text-editor flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white ring-1 ring-slate-200/80',
        disabled && 'pointer-events-none opacity-60',
        fullscreen && 'h-full rounded-none border-0 ring-0',
        className,
      )}
    >
      <EditorToolbar
        editor={editor}
        full={isFull}
        sourceMode={sourceMode}
        fullscreen={fullscreen}
        onToggleSource={toggleSource}
        onToggleFullscreen={() => setFullscreen((f) => !f)}
        onOpenLink={openLinkDialog}
        onOpenImage={openImageDialog}
        onOpenTable={() => setTableOpen(true)}
      />

      {sourceMode ? (
        <textarea
          value={sourceDraft}
          onChange={(e) => setSourceDraft(e.target.value)}
          spellCheck={false}
          className={cn(
            'w-full resize-none bg-slate-950 px-4 py-3 font-mono text-xs leading-relaxed text-slate-100 outline-none',
            fullscreen ? 'flex-1' : resolvedHeightClass,
          )}
        />
      ) : (
        <div
          className={cn(
            'overflow-y-auto overscroll-contain',
            fullscreen ? 'flex-1' : resolvedHeightClass,
          )}
        >
          <EditorContent editor={editor} />
        </div>
      )}

      {isFull && showStatusBar ? <StatusBar editor={editor} uploading={uploading} /> : null}
    </div>
  )

  return (
    <>
      {fullscreen ? (
        <div className="fixed inset-0 z-[80] flex flex-col bg-white p-0">{shell}</div>
      ) : (
        shell
      )}

      <LinkDialog
        open={linkOpen}
        initial={linkInitial}
        hasSelection={!editor.state.selection.empty}
        canRemove={editor.isActive('link')}
        onCancel={() => setLinkOpen(false)}
        onSubmit={applyLink}
        onRemove={() => {
          editor.chain().focus().extendMarkRange('link').unsetLink().run()
          setLinkOpen(false)
        }}
      />

      <ImageDialog
        open={imageOpen}
        initial={imageInitial}
        uploading={uploading}
        onCancel={() => setImageOpen(false)}
        onUpload={uploadImage}
        onSubmit={applyImage}
      />

      <TableDialog
        open={tableOpen}
        onCancel={() => setTableOpen(false)}
        onSubmit={(rows, cols, withHeaderRow) => {
          editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run()
          setTableOpen(false)
        }}
      />
    </>
  )
}

function StatusBar({ editor, uploading }: { editor: ReturnType<typeof useEditor>; uploading: boolean }) {
  const stats = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return null
      const storage = ed.storage.characterCount as
        | { words?: () => number; characters?: () => number }
        | undefined
      let h1 = 0
      let headings = 0
      let images = 0
      let imagesMissingAlt = 0
      let links = 0
      ed.state.doc.descendants((node) => {
        if (node.type.name === 'heading') {
          headings += 1
          if (node.attrs.level === 1) h1 += 1
        }
        if (node.type.name === 'image') {
          images += 1
          if (!String(node.attrs.alt ?? '').trim()) imagesMissingAlt += 1
        }
        if (node.marks?.some((m) => m.type.name === 'link')) links += 1
        return true
      })
      const words = storage?.words?.() ?? 0
      return {
        words,
        characters: storage?.characters?.() ?? 0,
        readingMinutes: Math.max(1, Math.round(words / 200)),
        h1,
        headings,
        images,
        imagesMissingAlt,
        links,
      }
    },
  })

  if (!stats) return null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-[11px] text-slate-600">
      <span>
        <strong className="font-semibold text-slate-800">{stats.words}</strong> words
      </span>
      <span>
        <strong className="font-semibold text-slate-800">{stats.characters}</strong> characters
      </span>
      <span>{stats.readingMinutes} min read</span>
      <span>{stats.headings} headings</span>
      <span>{stats.links} links</span>
      <span>{stats.images} images</span>
      {stats.h1 > 1 ? (
        <span className="font-medium text-amber-700">⚠ {stats.h1} H1s — use only one</span>
      ) : null}
      {stats.imagesMissingAlt > 0 ? (
        <span className="font-medium text-amber-700">⚠ {stats.imagesMissingAlt} image(s) missing alt</span>
      ) : null}
      {uploading ? <span className="font-medium text-violet-700">Uploading image…</span> : null}
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

/** Light pretty-print so the HTML source view is readable. */
function formatHtml(html: string): string {
  return html
    .replace(/></g, '>\n<')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}
