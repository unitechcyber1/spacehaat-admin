import type { SeoResource } from '../../services/seo/seo.service'

export type SeoVariant = {
  resource: SeoResource
  /** Layout route base, e.g. `/layout/seo`. */
  route: string
  /** Display label, e.g. "SEO" / "New SEO". */
  label: string
}

export const SEO_VARIANTS: Record<SeoResource, SeoVariant> = {
  seo: { resource: 'seo', route: '/layout/seo', label: 'SEO' },
  newSeo: { resource: 'newSeo', route: '/layout/new-seo', label: 'New SEO' },
}
