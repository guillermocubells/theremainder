import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const CollectionCardSkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="p-0">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <div className="flex gap-1 pt-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

interface CollectionGridSkeletonProps {
  count?: number;
}

const CollectionGridSkeleton = ({ count = 6 }: CollectionGridSkeletonProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <CollectionCardSkeleton key={i} />
    ))}
  </div>
);

export { CollectionCardSkeleton, CollectionGridSkeleton };
export default CollectionGridSkeleton;
