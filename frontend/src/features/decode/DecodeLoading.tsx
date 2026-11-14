import { Card } from "@/components/Card";
import { Skeleton } from "@/components/ui/skeleton";

export function DecodeLoading() {
  return (
    <Card aria-label="Decoding estimate" aria-busy="true" className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="space-y-2 border-t-2 border-dashed border-ink/20 pt-4">
          <div className="flex justify-between gap-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-7 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </Card>
  );
}
