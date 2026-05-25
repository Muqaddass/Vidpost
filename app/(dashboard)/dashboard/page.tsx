import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/icons/PlatformIcon";
import { PLATFORMS } from "@/lib/platforms/config";
import type { Platform, PostRow } from "@/lib/types/database";
import { formatDistanceToNow } from "date-fns";

export const metadata = { title: "Dashboard · VidPost" };
export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: accountsRaw }, { data: recentRaw }, { count: totalPosts }] =
    await Promise.all([
      supabase.from("connected_accounts").select("platform").eq("user_id", user.id),
      supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  const accounts = (accountsRaw ?? []) as Array<{ platform: Platform }>;
  const recent = (recentRaw ?? []) as PostRow[];
  const connectedSet = new Set<Platform>(accounts.map((a) => a.platform));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening on your accounts.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/create">+ New post</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Connected accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{connectedSet.size} <span className="text-base text-muted-foreground font-normal">/ 5</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalPosts ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Free</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(PLATFORMS) as Platform[]).map((p) => {
              const connected = connectedSet.has(p);
              return (
                <div
                  key={p}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm"
                  style={{ color: connected ? PLATFORMS[p].brandColor : undefined }}
                >
                  <PlatformIcon platform={p} className="size-4" />
                  {PLATFORMS[p].name}
                  {connected ? (
                    <Badge variant="secondary" className="ml-1">Connected</Badge>
                  ) : (
                    <Link href="/dashboard/connect" className="ml-1 text-xs text-primary underline">
                      Connect
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent posts</CardTitle>
          <Link href="/dashboard/posts" className="text-sm text-muted-foreground hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length > 0 ? (
            <ul className="divide-y divide-border">
              {recent.map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {post.caption?.slice(0, 80) || post.title || "Untitled"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.platforms.map((p) => (
                      <span key={p} style={{ color: PLATFORMS[p].brandColor }}>
                        <PlatformIcon platform={p} className="size-4" />
                      </span>
                    ))}
                    <StatusBadge status={post.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No posts yet.{" "}
              <Link href="/dashboard/create" className="text-primary underline">
                Create your first
              </Link>
              .
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: PostRow["status"] }) {
  const map: Record<PostRow["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Draft", variant: "outline" },
    scheduled: { label: "Scheduled", variant: "secondary" },
    publishing: { label: "Publishing", variant: "secondary" },
    published: { label: "Published", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
  };
  const m = map[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
