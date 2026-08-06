import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useLanguage } from "../hooks/useLanguage";
import { useFadeModal } from "../lib/animations";

interface ShareAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareAppModal({
  open,
  onOpenChange,
}: ShareAppModalProps) {
  const { t } = useLanguage();
  const modalRef = useFadeModal(open);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const appUrl = "https://family-cookbook-h4l.caffeine.xyz/";

  useEffect(() => {
    if (open) {
      // Generate QR code using a public API
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(appUrl)}`;
      setQrCodeUrl(qrApiUrl);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={modalRef} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.shareAppTitle}</DialogTitle>
          <DialogDescription>{t.shareAppDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          {qrCodeUrl && (
            <div className="rounded-lg border-2 border-gray-200 p-4 bg-white">
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            </div>
          )}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">{t.shareAppLink}</p>
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline break-all"
            >
              {appUrl}
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
