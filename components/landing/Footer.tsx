import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            V
          </span>
          <span>© {new Date().getFullYear()} VidPost</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
          <Link href="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms-of-service" className="hover:text-foreground">Terms of Service</Link>
          <Link href="/data-deletion" className="hover:text-foreground">Data Deletion</Link>
        </nav>
      </div>
    </footer>
  );
}
