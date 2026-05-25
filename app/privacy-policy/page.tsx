import { LandingFooter } from "@/components/landing/Footer";
import { LandingNavbar } from "@/components/landing/Navbar";

export const metadata = { title: "Privacy Policy · VidPost" };

export default function PrivacyPolicyPage() {
  return (
    <>
      <LandingNavbar />
      <main className="mx-auto max-w-3xl flex-1 px-6 py-16 prose prose-zinc dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: May 25, 2026</p>

        <h2>1. What we collect</h2>
        <p>
          VidPost collects the email address and password (hashed) you provide at signup, the
          social media account profile data (username, avatar, user ID) returned by each
          platform&apos;s OAuth flow, and the media files and captions you upload to publish.
        </p>

        <h2>2. Tokens & encryption</h2>
        <p>
          OAuth access tokens and refresh tokens are encrypted with AES-256-GCM before being
          stored. We never expose tokens to the browser and never share them with third
          parties.
        </p>

        <h2>3. Media storage</h2>
        <p>
          Uploaded videos and images are stored on Cloudflare R2. They are accessible at a
          public URL solely so the destination platforms can ingest them; the URL is not
          indexed or shared elsewhere by VidPost.
        </p>

        <h2>4. How we use your data</h2>
        <ul>
          <li>To authenticate you to your VidPost account.</li>
          <li>To publish content on your behalf to the platforms you&apos;ve connected.</li>
          <li>To display your post history and account status in the dashboard.</li>
        </ul>

        <h2>5. Sharing</h2>
        <p>
          We do not sell your data. We share content with the social platforms you connect
          (TikTok, Instagram, YouTube, LinkedIn, Pinterest) only when you publish.
        </p>

        <h2>6. Deletion</h2>
        <p>
          Disconnecting an account removes its tokens from our database. Deleting your VidPost
          account removes all associated rows. To request deletion, email{" "}
          <a href="mailto:support@vidpost.app">support@vidpost.app</a>.
        </p>

        <h2>7. Contact</h2>
        <p>
          Questions? Email <a href="mailto:support@vidpost.app">support@vidpost.app</a>.
        </p>
      </main>
      <LandingFooter />
    </>
  );
}
