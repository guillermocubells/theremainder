import { Helmet } from "react-helmet-async";
import { STORE_BRAND, STORE_SEO } from "@/config/store";

interface PageSEOProps {
  /** Page title — will be appended with brand: "Title | Brand" */
  title: string;
  /** Meta description ≤160 chars */
  description: string;
  /** Canonical path, e.g. "/faq" (absolute URL also accepted) */
  path?: string;
  /** Override OG image */
  ogImage?: string;
  /** OG type — defaults to "website" */
  ogType?: string;
  /** Additional JSON-LD structured data objects */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Set noindex if page should not be indexed */
  noindex?: boolean;
}

const PageSEO = ({
  title,
  description,
  path,
  ogImage,
  ogType = "website",
  jsonLd,
  noindex = false,
}: PageSEOProps) => {
  const fullTitle = `${title} | ${STORE_BRAND.name}`;
  const canonicalUrl = path
    ? path.startsWith("http")
      ? path
      : `${STORE_BRAND.url}${path}`
    : undefined;
  const image = ogImage || STORE_SEO.defaultOgImage;

  // Normalise JSON-LD to array
  const ldItems = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={STORE_BRAND.name} />
      <meta property="og:locale" content={STORE_SEO.locale} />
      <meta property="og:image" content={image} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Canonical */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* JSON-LD */}
      {ldItems.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
};

export default PageSEO;
