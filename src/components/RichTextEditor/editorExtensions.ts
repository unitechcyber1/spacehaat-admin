import StarterKit from '@tiptap/starter-kit'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'

/**
 * Image with the attributes SEO needs: `alt`, `title`, plus display width/alignment
 * so editors can lay images out without leaving the editor.
 */
const SeoImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: (attributes) => (attributes.width ? { width: attributes.width } : {}),
        parseHTML: (element) => element.getAttribute('width'),
      },
      align: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.align) return {}
          const style =
            attributes.align === 'center'
              ? 'display:block;margin-left:auto;margin-right:auto;'
              : attributes.align === 'right'
                ? 'display:block;margin-left:auto;'
                : 'display:block;margin-right:auto;'
          return { style, 'data-align': attributes.align }
        },
        parseHTML: (element) => element.getAttribute('data-align'),
      },
      loading: {
        default: null,
        renderHTML: (attributes) => (attributes.loading ? { loading: attributes.loading } : {}),
        parseHTML: (element) => element.getAttribute('loading'),
      },
    }
  },
})

export type BuildExtensionsOptions = {
  placeholder: string
  /** `compact` keeps the legacy minimal feature set for older forms. */
  full: boolean
}

export function buildExtensions({ placeholder, full }: BuildExtensionsOptions) {
  return [
    StarterKit.configure({
      heading: { levels: full ? [1, 2, 3, 4, 5, 6] : [2, 3] },
      bulletList: { HTMLAttributes: { class: 'list-disc' } },
      orderedList: { HTMLAttributes: { class: 'list-decimal' } },
      codeBlock: { HTMLAttributes: { class: 'rte-code-block' } },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: { class: 'rte-link', rel: 'noopener noreferrer' },
      },
    }),
    Placeholder.configure({ placeholder }),
    ...(full
      ? [
          CharacterCount.configure({ limit: null }),
          TextStyle,
          Color,
          Highlight.configure({ multicolor: true }),
          Subscript,
          Superscript,
          TextAlign.configure({ types: ['heading', 'paragraph'] }),
          TaskList,
          TaskItem.configure({ nested: true }),
          SeoImage.configure({ inline: false, HTMLAttributes: { class: 'rte-image' } }),
          Table.configure({ resizable: true, lastColumnResizable: false }),
          TableRow,
          TableHeader,
          TableCell,
        ]
      : []),
  ]
}
