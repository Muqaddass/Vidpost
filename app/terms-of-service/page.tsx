import { LandingFooter } from "@/components/landing/Footer";
import { LandingNavbar } from "@/components/landing/Navbar";

export const metadata = { title: "Terms of Service · VidPost" };

export default function TermsOfServicePage() {
  return (
    <>
      <LandingNavbar />
      <main className="mx-auto max-w-3xl flex-1 px-6 py-16 prose prose-zinc dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: May 25, 2026</p>

        <h2>1. The service</h2>
        <p>
          VidPost lets you publish videos and images to the social media platforms you connect.
          You retain ownership of all content you upload.
        </p>

        <h2>2. Your account</h2>
        <p>
          You are responsible for keeping your password and connected social accounts secure.
          You must be at least 13 years old to use VidPost (or the minimum age required in your
          country, whichever is higher).
        </p>

        <h2>3. Acceptable use</h2>
        <ul>
          <li>No content that violates the terms of any connected platform.</li>
          <li>No illegal content, harassment, or infringement of others&apos; rights.</li>
          <li>
            We may suspend or terminate accounts that abuse the service or platform APIs.
          </li>
        </ul>

        <h2>4. Platform terms</h2>
        <p>
          By connecting TikTok, Instagram, YouTube, LinkedIn, or Pinterest, you also agree to
          that platform&apos;s terms of service and developer policies.
        </p>

        <h2>5. Pricing</h2>
        <p>
          Free tier and a Pro tier at $9/month. Pricing may change with 30 days&apos; notice.
        </p>

        <h2>6. Disclaimer</h2>
        <p>
          The service is provided &quot;as is&quot;. We don&apos;t guarantee uptime or successful
          delivery to every platform every time — APIs change and rate limits exist.
        </p>

        <h2>7. Liability</h2>
        <p>
          To the maximum extent permitted by law, VidPost is not liable for indirect or
          consequential damages.
        </p>

        <h2>8. Contact</h2>
        <p>
          Email <a href="mailto:support@vidpost.app">support@vidpost.app</a> with any questions.
        </p>
      </main>
      <LandingFooter />
    </>
  );
}
