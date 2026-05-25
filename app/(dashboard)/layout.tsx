import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar, MobileNav } from "@/components/dashboard/Sidebar";
import { UserMenu } from "@/components/dashboard/UserMenu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border/40 bg-background/80 px-6 backdrop-blur">
          <div className="md:hidden flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground font-bold">
              V
            </span>
            <span>VidPost</span>
          </div>
          <div className="ml-auto">
            <UserMenu email={user.email ?? ""} />
          </div>
        </header>
        <main className="flex-1 px-6 pb-24 pt-8 md:pb-8">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
