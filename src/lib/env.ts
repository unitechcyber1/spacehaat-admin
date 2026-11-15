/** Public website. Previews always open here; a leftover spacehaat.com setting is swapped for it. */
const PUBLIC_SITE = 'https://spacewallah.com'

/** Rewrites any spacehaat.com (or www.) origin to spacewallah.com, keeping the path. */
function publicSite(value: string | undefined, fallback: string): string {
  const v = (value ?? '').trim()
  if (!v) return fallback
  return v.replace(/^https?:\/\/(www\.)?spacehaat\.(com|in)/i, PUBLIC_SITE)
}

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
  /** Public marketing site origin for India (no trailing path). Coworking preview: `{websitePath}/coworking/{slug}`. */
  websitePath: publicSite(import.meta.env.VITE_WEBSITE_URL as string | undefined, PUBLIC_SITE),
  /** Multi-country site base, e.g. `{base}/{country}/coworking-details/{slug}`. */
  websitePathCountry: publicSite(import.meta.env.VITE_WEBSITE_URL_COUNTRY as string | undefined, ''),
  /** Office listing preview base, e.g. `https://example.com/office-space/rent/` (trailing slash ok). */
  officeUrl: publicSite(import.meta.env.VITE_OFFICE_URL as string | undefined, ''),
}
