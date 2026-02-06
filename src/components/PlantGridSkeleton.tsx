import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const PlantCardSkeleton = () => (
  <Card className="overflow-hidden border-border">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <CardContent className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
    </CardContent>
  </Card>
);

interface PlantGridSkeletonProps {
  count?: number;
}

const PlantGridSkeleton = ({ count = 6 }: PlantGridSkeletonProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
    {Array.from({ length: count }).map((_, i) => (
      <PlantCardSkeleton key={i} />
    ))}
  </div>
);

export { PlantCardSkeleton, PlantGridSkeleton };
