import { Skeleton } from "@/components/ui/skeleton";

export default function DialerLoading() {
  return <div className="space-y-5"><Skeleton className="h-16 w-full" /><Skeleton className="h-72 w-full" /></div>;
}
