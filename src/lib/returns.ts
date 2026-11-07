// Return rules shared by the order page, the request action and the admin page.
export const RETURN_DAYS = 14;
export const RETURN_REASONS = ['Damaged or broken', 'Wrong item', 'Not as described', 'Changed my mind', 'Other'];

// True while a delivered order is still inside the return window.
export function returnWindowOpen(events: { at: string; step: number }[], delivered: number) {
  const at = events.filter(e => e.step === delivered).pop()?.at;
  return !at || Date.now() - Date.parse(at) < RETURN_DAYS * 864e5;
}
