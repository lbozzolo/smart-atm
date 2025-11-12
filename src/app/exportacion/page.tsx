import { redirect } from 'next/navigation'

export default function ExportPageRedirect() {
  // Server-side redirect to the new route
  redirect('/exportacion-de-leads')
}
