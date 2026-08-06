import { useLanguage } from "../hooks/useLanguage";
import { useGetUserProfile } from "../hooks/useQueries";

interface UserDisplayProps {
  principal: string;
  className?: string;
}

export default function UserDisplay({
  principal,
  className,
}: UserDisplayProps) {
  const { data: profile, isLoading } = useGetUserProfile(principal);
  const { t } = useLanguage();

  if (isLoading) {
    return <span className={className}>{t.loading}...</span>;
  }

  // Always show the user's name if available, otherwise show "Unknown User"
  const displayName = profile?.name || t.unknownUser;

  return <span className={className}>{displayName}</span>;
}
