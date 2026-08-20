import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/authorize";
import { processPendingImportJobs } from "@/lib/migration/process-job";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const result = await processPendingImportJobs(supabase);

  return NextResponse.json({ importJobs: result });
}
