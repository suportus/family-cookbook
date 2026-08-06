import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Calendar, Plus, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useLanguage } from "../hooks/useLanguage";
import {
  useFavoriteCookbook,
  useGetBooksForUser,
  useUnfavoriteCookbook,
} from "../hooks/useQueries";
import {
  useButtonHover,
  useFadePage,
  useFavoriteStarAnimation,
  useSlideFadeIn,
} from "../lib/animations";
import { formatDateShort } from "../lib/i18n";
import { useBookContext } from "./BookContext";

export default function BookListView() {
  const { data: books, isLoading } = useGetBooksForUser();
  const { setSelectedBookId, setView } = useBookContext();
  const { identity } = useInternetIdentity();
  const { language, t } = useLanguage();
  const favoriteMutation = useFavoriteCookbook();
  const unfavoriteMutation = useUnfavoriteCookbook();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const pageRef = useFadePage();
  const newCookbookButtonRef = useButtonHover();

  const handleBookClick = (bookId: string) => {
    setSelectedBookId(bookId);
    setView("book");
  };

  const handleCreateClick = () => {
    setView("createCookbook");
  };

  const isBookOwner = (bookOwnerId: string): boolean => {
    if (!identity) return false;
    return bookOwnerId === identity.getPrincipal().toString();
  };

  const handleToggleFavorite = async (
    e: React.MouseEvent,
    bookId: string,
    isFavorite: boolean,
  ) => {
    e.stopPropagation();

    try {
      if (isFavorite) {
        await unfavoriteMutation.mutateAsync(bookId);
      } else {
        await favoriteMutation.mutateAsync(bookId);
      }
    } catch (_error) {
      toast.error(t.failedUpdateFavorite);
    }
  };

  const filteredBooks = showFavoritesOnly
    ? books?.filter((book) => book.is_favorite)
    : books;

  if (isLoading) {
    return (
      <div className="container py-16">
        <div className="flex justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t.myCookbooks}</h2>
          <p className="text-muted-foreground">{t.manageCookbooks}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="rounded-full"
          >
            <Star
              className={`h-4 w-4 ${showFavoritesOnly ? "fill-primary text-primary" : "text-muted-foreground"}`}
            />
          </Button>
          <Button
            ref={newCookbookButtonRef}
            className="rounded-full"
            onClick={handleCreateClick}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t.newCookbook}
          </Button>
        </div>
      </div>

      {filteredBooks && filteredBooks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">
              {showFavoritesOnly ? t.noFavoriteCookbooks : t.noCookbooksYet}
            </h3>
            <p className="mb-4 text-center text-muted-foreground">
              {showFavoritesOnly ? t.addFavoritesToSee : t.createFirstCookbook}
            </p>
            {!showFavoritesOnly && (
              <Button onClick={handleCreateClick} className="rounded-full">
                <Plus className="mr-2 h-4 w-4" />
                {t.createCookbook}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBooks?.map((book, index) => (
            <BookCard
              key={book.id}
              book={book}
              index={index}
              isBookOwner={isBookOwner}
              handleBookClick={handleBookClick}
              handleToggleFavorite={handleToggleFavorite}
              t={t}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BookCard({
  book,
  index,
  isBookOwner,
  handleBookClick,
  handleToggleFavorite,
  t,
  language,
}: any) {
  const cardRef = useSlideFadeIn(index, true);
  const { ref: starRef, triggerAnimation } = useFavoriteStarAnimation();

  const handleStarClick = (e: React.MouseEvent) => {
    triggerAnimation();
    handleToggleFavorite(e, book.id, book.is_favorite);
  };

  return (
    <Card
      ref={cardRef}
      className="relative cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
      onClick={() => handleBookClick(book.id)}
    >
      {isBookOwner(book.owner.toString()) && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
            {t.myCookbookBadge}
          </span>
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-start gap-2 pr-12">
          <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
          <span className="line-clamp-2">{book.title}</span>
        </CardTitle>
        <CardDescription className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {t.created} {formatDateShort(book.created_at, language)}
          </span>
          <button
            type="button"
            ref={starRef}
            onClick={handleStarClick}
            className="rounded-full p-1 hover:bg-accent transition-colors flex-shrink-0"
            aria-label={book.is_favorite ? t.removeFavorite : t.addFavorite}
          >
            <Star
              className={`h-4 w-4 transition-colors duration-180 ${book.is_favorite ? "fill-primary text-primary" : "text-muted-foreground"}`}
            />
          </button>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
