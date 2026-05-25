import { startOAuth } from "@/lib/oauth-handlers";
export const dynamic = "force-dynamic";
export async function GET() {
  return startOAuth("youtube");
}
