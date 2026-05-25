import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreatePostForm } from "./CreatePostForm";
import type { Platform } from "@/lib/types/database";

export const metadata = { title: "Create post · VidPost" };
export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accountsRaw } = await supabase
    .from("connected_accounts")
    .select("platform")
    .eq("user_id", user.id);

  const accounts = (accountsRaw ?? []) as Array<{ platform: Platform }>;
  const connected = new Set<Platform>(accounts.map((a) => a.platform));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create a post</h1>
        <p className="text-muted-foreground">
          Upload media, write a caption, pick platforms, hit publish.
        </p>
      </div>
      <CreatePostForm connectedPlatforms={Array.from(connected)} />
    </div>
  );
}
