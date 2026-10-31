// Copies text to the clipboard. Uses the Clipboard API where available and
// falls back to a hidden text field with execCommand("copy") (older browsers,
// or pages where the API is blocked). Returns false if both fail.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the fallback.
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  // Off screen, and large enough font that iOS doesn't zoom in.
  field.style.cssText =
    "position:fixed;top:0;left:-9999px;opacity:0;font-size:16px";
  // Inside an open dialog if there is one: dialogs keep focus to themselves.
  const host =
    document.activeElement?.closest('[role="dialog"]') ?? document.body;
  host.appendChild(field);
  try {
    field.select();
    field.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
