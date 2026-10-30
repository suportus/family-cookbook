import { toast } from "sonner";

// Read-only share link. The token is in the URL fragment (after #), which the
// browser never sends to a server, so it doesn't end up in server logs or in
// Referer headers. The link uses the address the app is open on.
export function shareUrl(token: string): string {
  return `${window.location.origin}/#/s/${token}`;
}

// Phones (touch screen) with a share sheet use it; everything else copies.
function canShareSheet(): boolean {
  return (
    typeof navigator.share === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

async function copy(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Povezava je kopirana. Prilepite jo v WhatsApp ali Viber.");
  } catch {
    // Some browsers only copy right after a tap: offer a button to tap.
    toast("Povezava je pripravljena", {
      action: { label: "Kopiraj", onClick: () => void copy(url) },
    });
  }
}

// Opens the share sheet or copies the link. Browsers only open the share
// sheet right after a tap; when creating the link took too long, a toast
// with a "Deli" button gives a new tap.
export async function shareLink(url: string, title: string) {
  if (!canShareSheet()) {
    await copy(url);
    return;
  }
  try {
    await navigator.share({ title, url });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      toast("Povezava je pripravljena", {
        action: { label: "Deli", onClick: () => void shareLink(url, title) },
      });
      return;
    }
    await copy(url);
  }
}
