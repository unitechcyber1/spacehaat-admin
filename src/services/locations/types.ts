export type IdName = { id: string; name: string }

export type Country = {
  id: string
  name: string
  dial_code?: string
  iso_code?: string
  description?: string
  for_coWorking?: boolean
  for_office?: boolean
  for_coLiving?: boolean
  for_flatspace?: boolean
}

export type State = {
  id: string
  name: string
  description?: string
  country?: IdName
  for_coWorking?: boolean
  for_office?: boolean
  for_coLiving?: boolean
  for_flatspace?: boolean
}

export type City = {
  id: string
  name: string
  description?: string
  country?: IdName
  state?: IdName
  for_coWorking?: boolean
  for_office?: boolean
  for_coLiving?: boolean
  for_flatspace?: boolean
  for_virtual?: boolean
}

export type MicroLocation = {
  id: string
  name: string
  latitude?: number
  longitude?: number
  description?: string
  city?: { _id?: string; id?: string; name?: string } | IdName
  for_coWorking?: boolean
  for_office?: boolean
  for_coLiving?: boolean
  for_flatspace?: boolean
  for_buildings?: boolean
}

