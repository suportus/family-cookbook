import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useLanguage } from "../hooks/useLanguage";
import { useGetAppVersion } from "../hooks/useQueries";
import { useAboutModalAnimation } from "../lib/animations";

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AboutModal({ open, onOpenChange }: AboutModalProps) {
  const { data: appVersion } = useGetAppVersion();
  const modalRef = useAboutModalAnimation(open);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const { t } = useLanguage();

  const appUrl = "https://family-cookbook-h4l.caffeine.xyz/";

  useEffect(() => {
    if (open) {
      // Generate QR code using a public API (100px size for compact display)
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(appUrl)}`;
      setQrCodeUrl(qrApiUrl);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={modalRef} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {t.aboutTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex justify-center">
            <Button
              onClick={() => window.open("https://x.com/Suportus", "_blank")}
              className="w-full max-w-xs"
            >
              {t.followOnX}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {t.aboutVersion}: {appVersion || "1.0.0"}
            </p>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-sm">{t.aboutDescription}</p>
            <p className="text-sm text-muted-foreground">{t.aboutPrivacy}</p>
          </div>

          {qrCodeUrl && (
            <div className="flex flex-col items-center gap-2">
              <div className="rounded border-2 border-gray-200 p-2 bg-white">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="h-[100px] w-[100px]"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t.aboutQrCaption}
              </p>
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-sm">{t.aboutBuiltWith}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
