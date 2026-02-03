import { Helmet } from "react-helmet-async";
import type { Plant } from "@/data/plants";

interface ProductStructuredDataProps {
  plant: Plant;
  baseUrl?: string;
}

const ProductStructuredData = ({ plant, baseUrl = "https://frondaprima.lovable.app" }: ProductStructuredDataProps) => {
  const productUrl = `${baseUrl}/plant/${plant.id}`;
  const imageUrl = plant.images?.[0] ? `${baseUrl}${plant.images[0]}` : undefined;
  
  // Determine availability based on quantity
  const availability = plant.quantity > 0 
    ? "https://schema.org/InStock" 
    : "https://schema.org/OutOfStock";
  
  // Build JSON-LD structured data for Product schema
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: plant.name,
    description: plant.description,
    image: imageUrl,
    url: productUrl,
    sku: plant.id,
    brand: {
      "@type": "Brand",
      name: "Frondaprima"
    },
    category: plant.plantGroup || "Plantas",
    ...(plant.commonName && { alternateName: plant.commonName }),
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "EUR",
      price: plant.price || 0,
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      availability,
      seller: {
        "@type": "Organization",
        name: "Frondaprima",
        url: baseUrl
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "ES"
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 3,
            unitCode: "DAY"
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 5,
            unitCode: "DAY"
          }
        }
      }
    },
    // Additional product attributes
    ...(plant.containerSize && {
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "Tamaño del contenedor",
          value: plant.containerSize
        },
        ...(plant.hardinessZones ? [{
          "@type": "PropertyValue",
          name: "Zonas de rusticidad",
          value: plant.hardinessZones.join(", ")
        }] : [])
      ]
    })
  };

  // Meta description for SEO
  const metaDescription = `${plant.name}${plant.commonName ? ` (${plant.commonName})` : ''} - ${plant.description}. Precio: ${plant.price}€. Compra online en Frondaprima, botánica experimental en altura.`;

  // OG Image dimensions hint
  const ogTitle = `${plant.name}${plant.variety ? ` ${plant.variety}` : ''} | Frondaprima`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{ogTitle}</title>
      <meta name="description" content={metaDescription} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="product" />
      <meta property="og:url" content={productUrl} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={plant.description} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      <meta property="og:site_name" content="Frondaprima" />
      <meta property="og:locale" content="es_ES" />
      
      {/* Product-specific OG tags */}
      <meta property="product:price:amount" content={String(plant.price || 0)} />
      <meta property="product:price:currency" content="EUR" />
      <meta property="product:availability" content={plant.quantity > 0 ? "in stock" : "out of stock"} />
      {plant.plantGroup && <meta property="product:category" content={plant.plantGroup} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={productUrl} />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={plant.description} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={productUrl} />
      
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export default ProductStructuredData;
