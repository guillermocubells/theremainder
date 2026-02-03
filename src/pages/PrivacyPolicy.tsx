import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <article className="max-w-3xl mx-auto prose prose-sm sm:prose-base prose-neutral dark:prose-invert">
          {/* Page Header */}
          <header className="text-center mb-10 md:mb-14 not-prose">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              Política de Privacidad y de Cookies
            </h1>
            <p className="text-muted-foreground text-sm">
              Versión actualizada: 02/2026
            </p>
          </header>

          {/* I. POLÍTICA DE PRIVACIDAD */}
          <section className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              I. Política de Privacidad
            </h2>
            
            <p className="text-muted-foreground leading-relaxed">
              En cumplimiento del Reglamento (UE) 2016/679 (RGPD), la Ley Orgánica 3/2018, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD) y la Ley 34/2002, de Servicios de la Sociedad de la Información y Comercio Electrónico (LSSICE), se informa al usuario sobre el tratamiento de sus datos personales.
            </p>

            <Separator className="my-6" />

            {/* 1. Responsable del tratamiento */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                1. Responsable del tratamiento
              </h3>
              <ul className="space-y-1.5 text-muted-foreground text-sm list-none pl-0">
                <li><strong className="text-foreground">Titular:</strong> Guillermo Martínez Cubells Mengotti (en adelante, LA EMPRESA)</li>
                <li><strong className="text-foreground">NIF:</strong> 05317502V</li>
                <li><strong className="text-foreground">Domicilio:</strong> Paseo del Perú 66, San Sebastián de los Reyes, 28707, Madrid, España</li>
                <li><strong className="text-foreground">Correo electrónico:</strong> guillermocubells@gmail.com</li>
                <li><strong className="text-foreground">Teléfono:</strong> +34 655 699 978</li>
                <li><strong className="text-foreground">Sitio web:</strong> https://www.frondaprima.es</li>
                <li><strong className="text-foreground">Delegado de Protección de Datos (DPO):</strong> No designado.</li>
              </ul>
            </div>

            <Separator className="my-6" />

            {/* 2. Finalidades del tratamiento */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                2. Finalidades del tratamiento
              </h3>
              <p className="text-muted-foreground mb-3">
                Los datos personales recabados a través del SITIO WEB se tratarán para las siguientes finalidades:
              </p>
              <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
                <li>Gestión de compras y pedidos, incluyendo pagos, envíos, devoluciones, atención postventa y facturación.</li>
                <li>Gestión de la cuenta de usuario, permitiendo al usuario acceder a su historial de pedidos, direcciones y preferencias.</li>
                <li>Atención al cliente, para responder consultas o solicitudes realizadas por correo electrónico u otros medios de contacto.</li>
                <li>Comunicaciones comerciales, relacionadas con productos, servicios o novedades, cuando exista consentimiento o base legal suficiente.</li>
                <li>Recordatorios de compra en caso de procesos iniciados y no finalizados.</li>
                <li>Análisis y mejora del servicio, mediante datos agregados y anónimos.</li>
                <li>Prevención del fraude y seguridad del sitio web.</li>
                <li>Cumplimiento de obligaciones legales, especialmente fiscales, contables y de consumo.</li>
              </ul>
            </div>

            <Separator className="my-6" />

            {/* 3. Tipos de datos tratados */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                3. Tipos de datos tratados
              </h3>
              <p className="text-muted-foreground mb-3">
                Dependiendo del uso del SITIO WEB, LA EMPRESA puede tratar:
              </p>
              <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
                <li><strong className="text-foreground">Datos identificativos:</strong> nombre, apellidos, email, teléfono.</li>
                <li><strong className="text-foreground">Datos de envío y facturación:</strong> dirección postal completa.</li>
                <li><strong className="text-foreground">Datos fiscales:</strong> NIF/NIE/CIF y razón social, cuando el cliente los facilite para facturación (B2B).</li>
                <li><strong className="text-foreground">Datos de compra:</strong> productos adquiridos, importes, impuestos, moneda, devoluciones.</li>
                <li><strong className="text-foreground">Datos técnicos:</strong> IP, identificadores de sesión, cookies.</li>
              </ul>
              <p className="text-muted-foreground mt-3 text-sm italic">
                LA EMPRESA no almacena datos bancarios ni de tarjetas. Los pagos se gestionan íntegramente a través de plataformas externas seguras.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 4. Base jurídica del tratamiento */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                4. Base jurídica del tratamiento
              </h3>
              <p className="text-muted-foreground mb-3">
                El tratamiento de los datos se realiza sobre las siguientes bases legales:
              </p>
              <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
                <li>Ejecución de un contrato (art. 6.1.b RGPD).</li>
                <li>Cumplimiento de obligaciones legales (art. 6.1.c RGPD).</li>
                <li>Interés legítimo (art. 6.1.f RGPD), especialmente para seguridad y mejora del servicio.</li>
                <li>Consentimiento del usuario (art. 6.1.a RGPD), para comunicaciones comerciales y cookies no necesarias.</li>
              </ul>
            </div>

            <Separator className="my-6" />

            {/* 5. Destinatarios y encargados del tratamiento */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                5. Destinatarios y encargados del tratamiento
              </h3>
              <p className="text-muted-foreground mb-3">
                Los datos personales podrán ser tratados por terceros únicamente para la correcta prestación del servicio, actuando como encargados del tratamiento:
              </p>
              <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
                <li><strong className="text-foreground">Pasarela de pago:</strong> Stripe Payments</li>
                <li><strong className="text-foreground">Proveedor de hosting e infraestructura:</strong> Lovable Cloud, Supabase</li>
                <li><strong className="text-foreground">Email y comunicaciones:</strong> HubSpot</li>
                <li><strong className="text-foreground">Analítica:</strong> Lovable Analytics</li>
                <li><strong className="text-foreground">Transporte y mensajería:</strong> DHL, Correos, MRW, UPS</li>
              </ul>
              <p className="text-muted-foreground mt-3 text-sm">
                No se cederán datos a terceros salvo obligación legal.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 6. Transferencias internacionales de datos */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                6. Transferencias internacionales de datos
              </h3>
              <p className="text-muted-foreground">
                No se realizan transferencias internacionales de datos fuera del Espacio Económico Europeo.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 7. Plazo de conservación */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                7. Plazo de conservación
              </h3>
              <p className="text-muted-foreground mb-3">
                Los datos personales se conservarán:
              </p>
              <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
                <li>Mientras exista una relación contractual o comercial.</li>
                <li>Durante los plazos exigidos por la normativa fiscal y contable.</li>
                <li>Hasta que el usuario solicite la supresión, cuando sea legalmente posible.</li>
              </ul>
            </div>

            <Separator className="my-6" />

            {/* 8. Derechos del usuario */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                8. Derechos del usuario
              </h3>
              <p className="text-muted-foreground mb-3">
                El usuario puede ejercer los derechos de acceso, rectificación, supresión, oposición, limitación, portabilidad y no ser objeto de decisiones automatizadas, enviando una solicitud a:
              </p>
              <p className="text-muted-foreground mb-3">
                📧 <a href="mailto:guillermocubells@gmail.com" className="text-primary hover:underline">guillermocubells@gmail.com</a>
              </p>
              <p className="text-muted-foreground mb-3 text-sm">
                Indicando en el asunto: "Protección de datos".
              </p>
              <p className="text-muted-foreground text-sm">
                Asimismo, puede presentar reclamación ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.aepd.es</a>).
              </p>
            </div>

            <Separator className="my-6" />

            {/* 9. Medidas de seguridad */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                9. Medidas de seguridad
              </h3>
              <p className="text-muted-foreground">
                LA EMPRESA adopta las medidas técnicas y organizativas necesarias para garantizar la seguridad de los datos personales. El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 10. Menores de edad */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                10. Menores de edad
              </h3>
              <p className="text-muted-foreground">
                Los servicios del SITIO WEB están dirigidos exclusivamente a mayores de 18 años.
              </p>
            </div>
          </section>

          {/* II. POLÍTICA DE COOKIES */}
          <section className="space-y-6 mt-12">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              II. Política de Cookies
            </h2>

            <Separator className="my-6" />

            {/* 1. ¿Qué son las cookies? */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                1. ¿Qué son las cookies?
              </h3>
              <p className="text-muted-foreground">
                Las cookies son pequeños archivos que se almacenan en el dispositivo del usuario para permitir el funcionamiento del sitio web, recordar preferencias y analizar el uso del mismo.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 2. Tipos de cookies utilizadas */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                2. Tipos de cookies utilizadas
              </h3>
              <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
                <li><strong className="text-foreground">Cookies técnicas y necesarias:</strong> imprescindibles para el funcionamiento del sitio.</li>
                <li><strong className="text-foreground">Cookies analíticas:</strong> para medir el uso del sitio web y mejorar la experiencia del usuario.</li>
              </ul>
              <p className="text-muted-foreground mt-3 text-sm">
                No se utilizarán cookies de marketing sin consentimiento expreso.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 3. Consentimiento */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                3. Consentimiento
              </h3>
              <p className="text-muted-foreground">
                Al acceder al SITIO WEB, el usuario puede aceptar, rechazar o configurar el uso de cookies mediante el panel de configuración correspondiente.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 4. Eliminación de cookies */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                4. Eliminación de cookies
              </h3>
              <p className="text-muted-foreground">
                El usuario puede configurar su navegador para bloquear o eliminar cookies. La desactivación de cookies técnicas puede afectar al funcionamiento del sitio.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 5. Cambios en la política */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                5. Cambios en la política
              </h3>
              <p className="text-muted-foreground">
                LA EMPRESA se reserva el derecho a modificar la presente política para adaptarla a novedades legales o técnicas.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 6. Contacto */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                6. Contacto
              </h3>
              <p className="text-muted-foreground">
                Para cualquier duda relacionada con la privacidad o el uso de cookies:
              </p>
              <p className="text-muted-foreground mt-2">
                📧 <a href="mailto:guillermocubells@gmail.com" className="text-primary hover:underline">guillermocubells@gmail.com</a>
              </p>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
