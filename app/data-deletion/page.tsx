import { LandingFooter } from "@/components/landing/Footer";
import { LandingNavbar } from "@/components/landing/Navbar";

export const metadata = {
  title: "Data Deletion · VidPost",
  description: "How to request deletion of your VidPost account and data.",
};

export default function DataDeletionPage() {
  return (
    <>
      <LandingNavbar />
      <main className="mx-auto max-w-3xl flex-1 px-6 py-16 prose prose-zinc dark:prose-invert">
        <h1>Data Deletion</h1>
        <p className="text-muted-foreground">Last updated: June 9, 2026</p>

        <p>
          You have the right to request deletion of your VidPost account and all data
          associated with it. This page explains what gets deleted, how to request it, and
          how long it takes.
        </p>

        <h2>1. What gets deleted</h2>
        <ul>
          <li>Your VidPost account (email, hashed password, session data)</li>
          <li>All connected social media accounts and their encrypted OAuth tokens (TikTok, Instagram, YouTube, LinkedIn, Facebook, Pinterest)</li>
          <li>All posts you created in VidPost (captions, media URLs, per-platform publish results)</li>
          <li>All uploaded media files stored on our Cloudflare R2 bucket</li>
          <li>All post history, error logs, and account activity</li>
        </ul>

        <h2>2. What we can&apos;t delete on your behalf</h2>
        <ul>
          <li>
            <strong>Content already published to social platforms.</strong> Once VidPost
            posts a video/image to TikTok, Instagram, YouTube, LinkedIn, Facebook, or
            Pinterest, that content lives on those platforms under your account and can
            only be deleted from those platforms directly.
          </li>
          <li>
            <strong>Cached copies at social platforms.</strong> Platforms may have cached
            previews of the media URL we sent them at publish time. Those caches expire
            per each platform&apos;s retention policy.
          </li>
        </ul>

        <h2>3. How to request deletion</h2>

        <h3>Option A — self-serve (fastest)</h3>
        <p>
          Sign in at{" "}
          <a href="https://app.attavibe.com/login">app.attavibe.com/login</a> →{" "}
          <strong>Settings</strong> → <strong>Delete account</strong>. This removes
          everything listed above immediately. No confirmation email required.
        </p>

        <h3>Option B — email request</h3>
        <p>
          Email <a href="mailto:support@vidpost.app">support@vidpost.app</a> from the email
          address associated with your VidPost account. Include:
        </p>
        <ul>
          <li>Subject line: <em>Data deletion request</em></li>
          <li>Your VidPost account email</li>
          <li>Optional: which specific data you want deleted (leave blank to delete everything)</li>
        </ul>
        <p>
          We&apos;ll confirm receipt within 2 business days and complete the deletion
          within 30 days as required by GDPR / CCPA. You&apos;ll receive an email confirming
          completion.
        </p>

        <h3>Option C — Facebook / Instagram data deletion callback</h3>
        <p>
          If you revoke VidPost&apos;s access from your Facebook / Instagram account (via
          Facebook → Settings → Business Integrations → VidPost → Remove), Meta will
          send us a signed deletion request. We honor it automatically within 24 hours
          for your connected Meta account data.
        </p>

        <h2>4. Data retention after deletion</h2>
        <p>
          Once we complete deletion, no user-identifiable data remains in our systems.
          We retain aggregate, anonymized usage statistics (e.g., &quot;X posts published
          per day platform-wide&quot;) which cannot be linked back to you.
        </p>
        <p>
          Encrypted backups are purged within 30 days of the deletion request per our
          backup rotation schedule.
        </p>

        <h2>5. Turnaround time</h2>
        <ul>
          <li><strong>Self-serve (Option A):</strong> immediate</li>
          <li><strong>Email request (Option B):</strong> within 30 days, typically 1-3 business days</li>
          <li><strong>Meta deletion callback (Option C):</strong> within 24 hours of the signed request</li>
        </ul>

        <h2>6. Contact</h2>
        <p>
          Questions or concerns about data deletion? Email{" "}
          <a href="mailto:support@vidpost.app">support@vidpost.app</a>. For privacy issues
          more broadly, see our{" "}
          <a href="/privacy-policy">Privacy Policy</a>.
        </p>
      </main>
      <LandingFooter />
    </>
  );
}
