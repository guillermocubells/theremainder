import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { STORE_BRAND } from "@/config/store";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const { t } = useTranslation();

  const faqCategories = [
    {
      title: "Pedidos y Envíos",
      items: [
        {
          question: "¿Cuánto tiempo tarda en llegar mi pedido?",
          answer: "Los envíos nacionales (España peninsular) tardan entre 2-4 días laborables. Para Baleares y Canarias, el plazo es de 4-7 días laborables. Los envíos internacionales varían según el destino."
        },
        {
          question: "¿Cuánto cuesta el envío?",
          answer: "El coste de envío depende del destino y el número de plantas. Puedes ver el coste exacto en el carrito antes de finalizar la compra. Los envíos a España peninsular superiores a 75€ son gratuitos."
        },
        {
          question: "¿Cómo puedo hacer seguimiento de mi pedido?",
          answer: "Una vez enviado tu pedido, recibirás un email con el número de seguimiento. También puedes consultar el estado en tu cuenta, en la sección 'Mis Pedidos'."
        },
        {
          question: "¿Realizáis envíos internacionales?",
          answer: "Sí, enviamos a toda la Unión Europea. Los plazos y costes varían según el país de destino. Consulta nuestra página de envíos para más detalles."
        }
      ]
    },
    {
      title: "Plantas y Cuidados",
      items: [
        {
          question: "¿Las plantas llegan en buen estado?",
          answer: "Empaquetamos cada planta con el máximo cuidado para garantizar que llegue en perfectas condiciones. Si tu planta llega dañada, contacta con nosotros en las primeras 24 horas con fotos del estado."
        },
        {
          question: "¿Qué hago si mi planta llega dañada?",
          answer: "Contacta con nosotros inmediatamente a través del formulario de contacto o WhatsApp, adjuntando fotos del embalaje y la planta. Evaluaremos cada caso y ofreceremos una solución."
        },
        {
          question: "¿Incluyen instrucciones de cuidado?",
          answer: "Sí, cada planta viene con una ficha de cuidados básicos. Además, en la página de cada producto encontrarás información detallada sobre luz, riego, temperatura y otros cuidados específicos."
        },
        {
          question: "¿Qué tamaño tienen las plantas?",
          answer: "El tamaño varía según la especie y se indica en la ficha de cada producto. Incluimos las medidas aproximadas de altura y diámetro de maceta. Las fotos muestran ejemplares representativos."
        }
      ]
    },
    {
      title: "Pagos y Facturación",
      items: [
        {
          question: "¿Qué métodos de pago aceptáis?",
          answer: "Aceptamos tarjetas de crédito/débito (Visa, Mastercard, American Express) a través de Stripe, nuestra plataforma de pago segura."
        },
        {
          question: "¿Es seguro pagar en vuestra web?",
          answer: "Sí, utilizamos Stripe como pasarela de pago, que cumple con los más altos estándares de seguridad (PCI DSS). Tus datos bancarios nunca pasan por nuestros servidores."
        },
        {
          question: "¿Puedo solicitar factura?",
          answer: "Sí, generamos factura automáticamente para todos los pedidos. La recibirás en tu email y también estará disponible en tu cuenta."
        },
        {
          question: "¿Aceptáis pedidos de empresas (B2B)?",
          answer: "Sí, trabajamos con empresas, paisajistas y viveros. Contacta con nosotros para condiciones especiales en pedidos mayoristas."
        }
      ]
    },
    {
      title: "Devoluciones y Garantía",
      items: [
        {
          question: "¿Cuál es vuestra política de devolución?",
          answer: "Tienes 14 días naturales desde la recepción para ejercer tu derecho de desistimiento. Las plantas deben devolverse en su estado original. Consulta nuestras Condiciones de Venta para más detalles."
        },
        {
          question: "¿Qué garantía tienen las plantas?",
          answer: "Garantizamos que las plantas salen de nuestras instalaciones en perfecto estado. Si recibes una planta en mal estado, contacta en las primeras 24 horas para gestionar la incidencia."
        },
        {
          question: "¿Cómo solicito una devolución?",
          answer: "Contacta con nosotros a través del formulario de contacto indicando tu número de pedido y el motivo de la devolución. Te indicaremos los pasos a seguir."
        }
      ]
    },
    {
      title: "Programa de Referidos",
      items: [
        {
          question: "¿Cómo funciona el programa de referidos?",
          answer: "Comparte tu código de referido con amigos. Cuando realicen su primera compra, recibirás un 10% del valor de su pedido (máximo 20€) en tu monedero virtual."
        },
        {
          question: "¿Cuándo puedo usar mi saldo de referidos?",
          answer: "El saldo estará disponible 14 días después de que el pedido de tu referido sea entregado. Esto es para cubrir el período de devolución."
        },
        {
          question: "¿Dónde encuentro mi código de referido?",
          answer: "Puedes encontrar tu código único en la página del Programa de Referidos, accesible desde el menú de tu cuenta o el footer de la web."
        }
      ]
    },
    {
      title: "Cuenta y Privacidad",
      items: [
        {
          question: "¿Necesito crear una cuenta para comprar?",
          answer: "No es obligatorio, pero recomendamos crear una cuenta para acceder a tu historial de pedidos, gestionar tu colección de plantas y participar en el programa de referidos."
        },
        {
          question: "¿Cómo puedo eliminar mi cuenta?",
          answer: "Puedes solicitar la eliminación de tu cuenta contactando con nosotros. Procesaremos tu solicitud conforme a la normativa de protección de datos."
        },
        {
          question: "¿Qué hacéis con mis datos personales?",
          answer: "Tratamos tus datos conforme al RGPD. Solo los utilizamos para gestionar tus pedidos y, si lo autorizas, para enviarte comunicaciones comerciales. Consulta nuestra Política de Privacidad para más información."
        }
      ]
    }
  ];

  return (
    <>
      <Helmet>
        <title>{`${t('faq.title', 'Preguntas Frecuentes (FAQ)')} | ${STORE_BRAND.name}`}</title>
        <meta
          name="description"
          content={t('faq.metaDescription', `Encuentra respuestas a las preguntas más frecuentes sobre pedidos, envíos, cuidados de plantas, pagos y devoluciones en ${STORE_BRAND.name}.`)}
        />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Preguntas Frecuentes
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Encuentra respuestas a las dudas más comunes sobre nuestros productos, 
              envíos, pagos y políticas.
            </p>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {faqCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  {category.title}
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {category.items.map((item, itemIndex) => (
                    <AccordionItem key={itemIndex} value={`${categoryIndex}-${itemIndex}`}>
                      <AccordionTrigger className="text-left hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-12 text-center bg-muted/30 rounded-lg p-8 border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              ¿No encuentras lo que buscas?
            </h3>
            <p className="text-muted-foreground mb-4">
              Nuestro equipo está aquí para ayudarte con cualquier duda.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Contactar con nosotros
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default FAQ;
