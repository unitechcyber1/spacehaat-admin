/** Brand + nested SEO; keeps `any` for API flexibility. */

export type SeoSocial = {
  title?: string
  description?: string
  image?: { id?: string; s3_link?: string; real_name?: string; name?: string; title?: string }
}

export type BrandSeo = {
  title?: string
  description?: string
  keywords?: string
  robots?: string
  url?: string
  footer_title?: string
  footer_description?: string
  twitter?: SeoSocial
  open_graph?: SeoSocial
}

export type BrandImageSlot = {
  order?: number
  image?: {
    id?: string
    s3_link?: string
    real_name?: string
    name?: string
    title?: string
  }
}

export type Brand = {
  id?: string
  name?: string
  description?: string
  order?: number
  review?: string
  type?: string
  brand_tag?: string
  brand_tag_line?: string
  logo_tag_line?: string
  should_show_on_home?: boolean
  trusted_user?: boolean | string
  google_sheet_url?: string
  image?: { id?: string; s3_link?: string; real_name?: string; name?: string } | null
  images?: BrandImageSlot[]
  cities?: string[]
  seo?: BrandSeo
}
