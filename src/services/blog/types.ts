import type { SeoRecord, SeoSocialImage } from '../seo/types'

export type BlogFile = {
  id?: string
  s3_link?: string
}

export type BlogDetail = {
  news_image?: BlogFile | SeoSocialImage
  should_show_on_home?: boolean
  url?: string
}

/** Matches Angular `Blog` in `blog.model.ts`. */
export type BlogRecord = {
  id?: string
  _id?: string
  slug?: string
  blog_type?: string
  cover_picture?: BlogFile | SeoSocialImage
  description?: string
  heading?: string
  status?: string
  seo?: SeoRecord
  detail?: BlogDetail
}

export const BLOG_TYPES = [
  { value: 'coworking', label: 'Co Working' },
  { value: 'coliving', label: 'Co Living' },
  { value: 'office', label: 'Office' },
  { value: 'virtualoffice', label: 'Virtual Office' },
] as const

export const BLOG_SEO_STATUSES = [
  { value: true, label: 'Active' },
  { value: false, label: 'Inactive' },
] as const
