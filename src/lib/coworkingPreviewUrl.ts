import { env } from './env'

/**
 * Public coworking space page on the marketing site, e.g.
 * `https://spacehaat.com/coworking/awfis-ambience-mall` (slug is the path segment after `/coworking/`).
 *
 * India (or empty `country_dbname`): `{VITE_WEBSITE_URL}/coworking/{slug}`
 * Other countries (when `VITE_WEBSITE_URL_COUNTRY` is set): legacy multi-country path.
 */
export function buildCoworkingListingPreviewUrl(opts: {
  slug?: string
  country_dbname?: string
}): string | null {
  const slug = (opts.slug ?? '').trim().toLowerCase()
  if (!slug) return null

  const country = (opts.country_dbname ?? '').trim().toLowerCase()
  const baseIndia = env.websitePath.replace(/\/$/, '')
  const baseIntl = env.websitePathCountry.replace(/\/$/, '')

  if (country === 'india' || country === '') {
    if (!baseIndia) return null
    return `${baseIndia}/coworking/${slug}`
  }

  if (baseIntl) {
    return `${baseIntl}/${country}/coworking-details/${slug}`
  }

  return null
}
