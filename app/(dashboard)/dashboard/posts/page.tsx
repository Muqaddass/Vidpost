import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlatformIcon } from "@/components/icons/PlatformIcon";
import { PLATFORMS } from "@/lib/platforms/config";
import type { Platform, PostResultRow, PostRow } from "@/lib/types/database";

export const metadata = { title: "Posts · VidPost" };
export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: postsRaw } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const posts = (postsRaw ?? []) as PostRow[];
  const postIds = posts.map((p) => p.id);

  const { data: resultsRaw } =
    postIds.length > 0
      ? await supabase.from("post_results").select("*").in("post_id", postIds)
      : { data: [] };

  const results = (resultsRaw ?? []) as PostResultRow[];

  const resultsByPost = new Map<string, PostResultRow[]>();
  for (const r of results) {
    const arr = resultsByPost.get(r.post_id) ?? [];
    arr.push(r);
    resultsByPost.set(r.post_id, arr);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
          <p className="text-muted-foreground">Everything you&apos;ve published or attempted.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/create">+ New post</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {posts.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No posts yet.{" "}
              <Link href="/dashboard/create" className="text-primary underline">
                Create one
              </Link>
              .
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caption</TableHead>
                  <TableHead>Platforms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => {
                  const rs = resultsByPost.get(post.id) ?? [];
                  return (
                    <TableRow key={post.id}>
                      <TableCell className="max-w-[320px]">
                        <p className="truncate font-medium">
                          {post.caption?.slice(0, 80) || post.title || "Untitled"}
                        </p>
                        {rs.some((r) => r.status === "failed") && (
                          <p className="mt-1 truncate text-xs text-destructive">
                            {rs.find((r) => r.status === "failed")?.error_message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {post.platforms.map((p) => {
                            const result = rs.find((r) => r.platform === p);
                            const ok = result?.status === "success";
                            return (
                              <span
                                key={p}
                                title={`${PLATFORMS[p].name}: ${result?.status ?? "pending"}`}
                                style={{
                                  color: ok ? PLATFORMS[p].brandColor : "var(--muted-foreground)",
                                  opacity: ok ? 1 : 0.4,
                                }}
                              >
                                <PlatformIcon platform={p as Platform} className="size-4" />
                              </span>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={post.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: PostRow["status"] }) {
  const map: Record<
    PostRow["status"],
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    draft: { label: "Draft", variant: "outline" },
    scheduled: { label: "Scheduled", variant: "secondary" },
    publishing: { label: "Publishing", variant: "secondary" },
    published: { label: "Published", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
  };
  const m = map[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
