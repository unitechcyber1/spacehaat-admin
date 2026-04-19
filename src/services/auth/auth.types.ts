export type LoginRequest = {
  email: string
  password: string
}

// Backend response shape isn't strictly documented here; we persist it as-is
// Full user object is stored in localStorage under `user`.
export type LoginResponse = any

