/** Coworking category / plan row from the categorys list API. */
export type CoworkingCategoryPlan = {
  id?: string
  name?: string
  description?: string
  icons?: string | { s3_link?: string; id?: string }
  country?: string | { id?: string; name?: string }
  status?: string
}

/** Workspace list row — loose typing for workspaces list payloads. */
export type WorkspaceListItem = {
  id?: string
  _id?: string
  name?: string
  status?: string
  slug?: string
  country_dbname?: string
  location?: {
    name?: string
    city?: { name?: string; id?: string } | string
    /** Single microlocation, string id/slug, or list (populate from API). */
    micro_location?:
      | { name?: string; id?: string }
      | string
      | Array<{ name?: string; id?: string } | string>
    micro_location_string?: string
    country?: string
  }
  isSelected?: boolean
  is_popular?: { value?: boolean; order?: number }
  priority?: Record<string, unknown>
}
