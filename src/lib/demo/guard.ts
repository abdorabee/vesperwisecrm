import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  DEMO_WRITE_REJECTED_MESSAGE,
  isDemoAccountEmail,
} from "@/lib/demo/account";

export async function rejectDemoAccountWrites(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isDemoAccountEmail(user?.email)) {
    throw new Error(DEMO_WRITE_REJECTED_MESSAGE);
  }
}
