/**
 * Is a stored robots value indexable? Only an explicit "noindex" turns indexing off.
 * Empty, "index,follow", "INDEX, FOLLOW" or "index, follow, max-image-preview:large" all mean index,
 * so opening and saving a form never switches a page out of Google by accident.
 */
export function isIndexable(robots: unknown): boolean {
  return !/noindex/i.test(typeof robots === 'string' ? robots : '')
}
