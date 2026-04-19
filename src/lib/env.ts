export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
  /** Public site base for India listings (preview). */
  websitePath: (import.meta.env.VITE_WEBSITE_URL as string | undefined) ?? '',
  /** Multi-country site base, e.g. `{base}/{country}/coworking-details/{slug}`. */
  websitePathCountry: (import.meta.env.VITE_WEBSITE_URL_COUNTRY as string | undefined) ?? '',
  /** Office listing preview base, e.g. `https://example.com/office-space/rent/` (trailing slash ok). */
  officeUrl: (import.meta.env.VITE_OFFICE_URL as string | undefined) ?? '',
}

