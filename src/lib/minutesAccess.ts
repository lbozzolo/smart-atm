const parseEmails = (value: string | undefined) =>
  value
    ? value
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(Boolean)
    : []

const configuredEmails = parseEmails(process.env.NEXT_PUBLIC_MINUTES_ALLOWED_EMAILS)
const fallbackEmails = parseEmails(process.env.NEXT_PUBLIC_MINUTES_DEFAULT_EMAILS)

const minutesAllowedEmails = configuredEmails.length > 0 ? configuredEmails : fallbackEmails

export const getMinutesAllowedEmails = () => minutesAllowedEmails

export const isMinutesAllowed = (email?: string | null) => {
  if (!email) {
    return false
  }

  return minutesAllowedEmails.includes(email.toLowerCase())
}
