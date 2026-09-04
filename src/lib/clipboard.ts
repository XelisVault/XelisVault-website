/**
 * Clipboard that never fails silently.
 *
 * navigator.clipboard is unavailable in insecure contexts, some mobile
 * browsers and denied-permission states. Payment pages MUST give the
 * payer/merchant real feedback, so we fall back to the legacy
 * execCommand path before giving up.
 */

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* permission denied or insecure context: fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** keep the first and last chars, ellipsis in the middle */
export function middleTruncate(s: string, head = 30, tail = 12): string {
  if (s.length <= head + tail + 1) return s
  return `${s.slice(0, head)}…${s.slice(-tail)}`
}
