import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 font-semibold">
        <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold">
          V
        </span>
        <span className="text-xl">VidPost</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
