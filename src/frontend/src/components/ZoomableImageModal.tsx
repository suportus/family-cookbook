import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useImageZoomModalAnimation } from "../lib/animations";

interface ZoomableImageModalProps {
  imageUrl: string;
  imageAlt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ZoomableImageModal({
  imageUrl,
  imageAlt,
  isOpen,
  onClose,
}: ZoomableImageModalProps) {
  const overlayRef = useImageZoomModalAnimation(isOpen);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClose();
      }}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 rounded-full bg-white/10 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Image container */}
      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt={imageAlt}
          className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
          style={{
            touchAction: "pinch-zoom",
          }}
        />
      </div>
    </div>
  );
}
