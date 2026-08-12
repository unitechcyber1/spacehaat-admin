import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { BlogRecord } from './types'

/** GET `admin/blogs` — matches Angular `BlogService.getBlogs`. */
export async function getBlogs(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<BlogRecord>>('admin/blogs', { params })
  return res.data
}

/** GET `admin/blog/:id` */
export async function getBlogById(blogId: string) {
  const res = await apiClient.get<ObjectResponse<BlogRecord>>(`admin/blog/${blogId}`)
  return res.data.data
}

/** POST `admin/blog` or PUT `admin/blog/:id` */
export async function saveBlog(blog: BlogRecord) {
  const id = blog.id ?? blog._id
  if (id) {
    const res = await apiClient.put<ObjectResponse<BlogRecord>>(`admin/blog/${id}`, blog)
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<BlogRecord>>('admin/blog', blog)
  return res.data
}

/** POST `admin/blog/changeStatus/:id` with full blog payload */
export async function changeBlogStatus(blog: BlogRecord) {
  const id = blog.id ?? blog._id
  const res = await apiClient.post<ObjectResponse<BlogRecord>>(
    `admin/blog/changeStatus/${id}`,
    blog,
  )
  return res.data
}

/** DELETE `admin/blog/:id` */
export async function deleteBlog(blogId: string) {
  const res = await apiClient.delete<ObjectResponse<unknown>>(`admin/blog/${blogId}`)
  return res.data
}

/** PUT `admin/blog/slug/update` */
export async function updateBlogSlug(payload: { id: string; slug: string }) {
  const res = await apiClient.put<ObjectResponse<unknown>>('admin/blog/slug/update', payload)
  return res.data
}
