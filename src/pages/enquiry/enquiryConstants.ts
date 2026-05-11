export const ENQUIRY_PAGE_SIZE_DEFAULT = 10

export const SPACE_TYPE_FILTER = [
  { value: 'Web Coworking', label: 'Coworking' },
  { value: 'Web Office Space', label: 'Office Space' },
  { value: 'Web Virtual Office', label: 'Virtual Office' },
  { value: 'Web Coliving', label: 'Coliving' },
  { value: 'Web Others', label: 'Others' },
  { value: 'Site Visit', label: 'Site Visit' },
  { value: 'All', label: 'All' },
] as const

export const LEAD_STAGES = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'New' },
  { label: 'Lead Called', value: 'Lead Called' },
  { label: 'Interested', value: 'Interested' },
  { label: 'Proposal Sent', value: 'Proposal Sent' },
  { label: 'Site Visit Aligned', value: 'Site Visit Aligned' },
  { label: 'Site Visit Done', value: 'Site Visit Done' },
  { label: 'Agreement Stage', value: 'Agreement Stage' },
  { label: 'Security Deposited', value: 'Security Deposited' },
  { label: 'Deal Done', value: 'Deal Done' },
  { label: 'Lead Lost', value: 'Lead Lost' },
] as const

export const INTERESTED_IN_FILTER = [
  { value: 'all', label: 'All' },
  { value: 'dedicated-desk', label: 'Dedicated Desk' },
  { value: 'day-pass', label: 'Day Pass' },
  { value: 'private-cabin', label: 'Private Cabin' },
  { value: 'hot-desk', label: 'Hot Desk' },
  { value: 'office-suite', label: 'Office Suite' },
  { value: 'cxo-suite', label: `CXO's Suite` },
  { value: 'custom-buildout', label: 'Custom BuildOut' },
] as const

export const SEAT_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { label: '1-5', value: '1-5' },
  { label: '6-10', value: '6-10' },
  { label: '11-20', value: '11-20' },
  { label: '20-50', value: '20-50' },
  { label: '50-100', value: '50-100' },
  { label: '50+', value: '50+' },
  { label: '100+', value: '100+' },
] as const

export const BUDGET_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { label: 'Above 40k', value: 'Above 40k' },
  { label: '30k to 40k', value: '30k to 40k' },
  { label: '20k to 30k', value: '20k to 30k' },
  { label: '15k to 20k', value: '15k to 20k' },
  { label: '10k to 15k', value: '10k to 15k' },
] as const

export const DATE_PRESETS = [
  { value: 'custom', label: 'Custom' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'all', label: 'All' },
] as const

export const FORM_SPACE_TYPES = [
  { label: 'Coworking', value: 'Web Coworking' },
  { label: 'Coliving', value: 'Web Coliving' },
  { label: 'Office Space', value: 'Web Office Space' },
  { label: 'Virtual Office', value: 'Web Virtual Office' },
  { label: 'Others', value: 'Web Others' },
] as const

export const LEAD_SOURCE_OPTIONS = [
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'Reference', value: 'reference' },
  { label: 'Contact Form', value: 'contactForm' },
  { label: 'Other', value: 'other' },
] as const

export const FORM_SEAT_OPTIONS = [
  { label: '1-5', value: '1-5' },
  { label: '6-10', value: '6-10' },
  { label: '11-20', value: '11-20' },
  { label: '20-50', value: '20-50' },
  { label: '50-100', value: '50-100' },
  { label: '50+', value: '50+' },
  { label: '100+', value: '100+' },
] as const

export const FORM_BUDGET_OPTIONS = [
  { label: 'Above 40k', value: 'Above 40k' },
  { label: '30k to 40k', value: '30k to 40k' },
  { label: '20k to 30k', value: '20k to 30k' },
  { label: '15k to 20k', value: '15k to 20k' },
  { label: '10k to 15k', value: '10k to 15k' },
] as const
