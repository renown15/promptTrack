import { Analytics } from "@/components/features/analytics/Analytics";
import { useCollections } from "@/hooks/useCollections";
import "@/pages/AnalyticsPage.css";
import { useParams } from "react-router-dom";

export function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: collections } = useCollections();

  const collection = collections?.find((c) => c.id === id);

  return (
    <div className="analytics-page">
      <div className="analytics-page__header">
        <h1 className="analytics-page__title">
          {collection?.name ?? "Collection"} — Analytics
        </h1>
      </div>
      {id && <Analytics collectionId={id} />}
    </div>
  );
}
