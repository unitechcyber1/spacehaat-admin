/** Matches Angular `Amenty` model / API payloads. */
export type AmenityCategory = 'facilities' | 'recreational' | 'others' | string

export type AmenityRecord = {
  id?: string
  _id?: string
  name?: string
  category?: AmenityCategory
  icon?: string
  checked?: boolean
  flag?: boolean
  for_coLiving?: boolean
  for_office?: boolean
  for_coWorking?: boolean
  for_flatspace?: boolean
  for_builder_project?: boolean
}
