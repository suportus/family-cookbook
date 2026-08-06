import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useBookContext } from "./BookContext";

interface BackButtonProps {
  label: string;
}

export default function BackButton({ label }: BackButtonProps) {
  const { setView } = useBookContext();

  const handleBack = () => {
    // Navigate back to home view (cookbook list)
    setView("home");
  };

  return (
    <Button variant="ghost" onClick={handleBack} className="mb-6">
      <ArrowLeft className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
