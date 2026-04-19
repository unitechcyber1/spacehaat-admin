/** Quarter-hour slots as `09:00 AM` for workspace hours dropdowns. */
export const HOUR_OPTIONS: { value: string; label: string }[] = (() => {
  const out: { value: string; label: string }[] = []
  for (let total = 0; total < 24 * 60; total += 15) {
    const h24 = Math.floor(total / 60)
    const m = total % 60
    let h12: number
    let period: 'AM' | 'PM'
    if (h24 === 0) {
      h12 = 12
      period = 'AM'
    } else if (h24 < 12) {
      h12 = h24
      period = 'AM'
    } else if (h24 === 12) {
      h12 = 12
      period = 'PM'
    } else {
      h12 = h24 - 12
      period = 'PM'
    }
    const label = `${h12}:${m.toString().padStart(2, '0')} ${period}`
    out.push({ value: label, label })
  }
  return out
})()
