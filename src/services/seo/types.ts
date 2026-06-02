/** Matches Angular `SocialNetworkForSeo` / nested SEO social fields. */
export type SeoSocialImage = string | { id?: string; s3_link?: string }

export type SeoSocial = {
  title?: string
  description?: string
  image?: SeoSocialImage
}

export type SeoFaq = {
  question: string
  answer: string
}

export type SeoReview = {
  name: string
  review: string
  rating: number | null
  company_name: string
  designation: string
}

/** Matches Angular `SEO` in `work-space.model.ts`. */
export type SeoRecord = {
  id?: string
  _id?: string
  page_title?: string
  script?: string
  title?: string
  description?: string
  robots?: string
  keywords?: string
  footer_description?: string
  footer_title?: string
  url?: string
  status?: boolean
  path?: string
  twitter?: SeoSocial
  open_graph?: SeoSocial
  faqs?: SeoFaq[]
  reviews?: SeoReview[]
}
