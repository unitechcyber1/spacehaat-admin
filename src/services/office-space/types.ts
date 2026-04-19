/** List row shape from `GET admin/officeSpaces` (matches Angular `OfficeSpace` list usage). */
export type OfficeSpaceListItem = {
  id?: string
  _id?: string
  productId?: string
  name?: string
  slug?: string
  status?: string
  added_on?: string
  user?: { id?: string; name?: string; email?: string; phone_number?: string }
  location?: {
    city?: { id?: string; name?: string } | string
    micro_location?: Array<{ name?: string }> | { name?: string }
  }
  other_detail?: { building_name?: string }
}
