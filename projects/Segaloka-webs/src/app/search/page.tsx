import {
  SearchResultsClient,
} from "@/components/search/SearchResultsClient";

type SearchPageProps = {
  searchParams: Promise<{
    category?: string;
    origin?: string;
    destination?: string;
    travelers?: string;
    adult?: string;
    child?: string;
    infant?: string;
    date?: string;
    departureDate?: string;
    returnDate?: string;
    year?: string;
  }>;
};

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  const params = await searchParams;

  return (
    <SearchResultsClient
      category={params.category || ""}
      origin={params.origin || ""}
      destination={params.destination || ""}
      travelers={params.travelers || ""}
      adult={params.adult || ""}
      child={params.child || ""}
      infant={params.infant || ""}
      date={params.date || ""}
      departureDate={
        params.departureDate ||
        params.date ||
        ""
      }
      returnDate={params.returnDate || ""}
      year={params.year || ""}
    />
  );
}