/** Media row / form — aligned with Angular `MediaModel` + API image object. */
export type MediaImageRef = {
  id?: string
  s3_link?: string
  real_name?: string
  name?: string
}

export type MediaItem = {
  id?: string
  _id?: string
  name?: string
  description?: string
  /** List/detail may populate an image object; save payload uses the file id string only. */
  image?: MediaImageRef | string
}
