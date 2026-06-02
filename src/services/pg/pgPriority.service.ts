import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { PgRecord } from './pg.service'

export type PgPriorityType = 'overall' | 'location' | 'micro_location'

export type PgPrioritySlotPayload = {
  is_active: boolean
  order: number
  city?: string
  name?: string
}

export async function getPriorityPgs(params: { type: PgPriorityType; city?: string }) {
  const res = await apiClient.get<ArrayResponse<PgRecord>>('admin/pg/priority/type', { params })
  return res.data
}

export async function savePgPriority(payload: {
  id: string
  type: PgPriorityType
  data: PgPrioritySlotPayload
}) {
  const res = await apiClient.post<ObjectResponse<unknown>>('admin/pg/priority', payload)
  return res.data
}

export async function changePgPriorityOrder(payload: {
  type: PgPriorityType
  shiftedId: string
  initialPosition: number
  finalPosition: number
}) {
  const res = await apiClient.post<ObjectResponse<unknown>>('admin/pg/priority/changeOrder', payload)
  return res.data
}

export async function dragPgPriority(payload: {
  priorityType: PgPriorityType
  virtual_priority?: boolean
  updatedProjects: { _id: string; priority: Record<string, unknown> }[]
}) {
  const res = await apiClient.put<ObjectResponse<unknown>>('admin/pg/priority/drag', {
    virtual_priority: false,
    ...payload,
  })
  return res.data
}
