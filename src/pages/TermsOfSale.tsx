import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";
import { STORE_CONTACT } from "@/config/store";
import { PageSEO } from "@/components/seo";

const TermsOfSale = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Condiciones de Venta"
        description="Condiciones generales de venta de The Remainder. Información legal sobre pedidos, pagos y entregas."
        path="/condiciones-venta"
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <article className="max-w-3xl mx-auto prose prose-sm sm:prose-base prose-neutral dark:prose-invert">
          {/* Page Header */}
          <header className="text-center mb-10 md:mb-14 not-prose">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              Condiciones Generales de Venta
            </h1>
            <p className="text-muted-foreground text-sm">
              Versión actualizada: 02/2026
            </p>
          </header>

          <section className="space-y-6">
            {/* 1. Identificación del vendedor */}
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
                1. Identificación del vendedor
              </h2>
              <ul className="space-y-1.5 text-muted-foreground text-sm list-none pl-0">
                <li><strong className="text-foreground">Titular:</strong> Guillermo Martínez Cubells Mengotti</li>
                <li><strong className="text-foreground">NIF:</strong> 05317502V</li>
                <li><strong className="text-foreground">Domicilio:</strong> Paseo del Perú 66, San Sebastián de los Reyes, 28707, Madrid, España</li>
                <li><strong className="text-foreground">Correo electrónico:</strong> guillermocubells@gmail.com</li>
                <li><strong className="text-foreground">Teléfono:</strong> +34 655 699 978</li>
                <li><strong className="text-foreground">Sitio web:</strong> https://www.theremainder.es</li>
              </ul>
            </div>

            <Separator className="my-6" />

            {/* 2. Ámbito de aplicación */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                2. Ámbito de aplicación
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Las presentes Condiciones Generales de Venta regulan la relación contractual entre el comprador (en adelante, EL CLIENTE) y Guillermo Martínez Cubells Mengotti (en adelante, LA EMPRESA) para la adquisición de productos a través del sitio web www.theremainder.es.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                La realización de un pedido implica la aceptación íntegra de estas condiciones.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 3. Productos */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                3. Productos
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                LA EMPRESA comercializa plantas ornamentales y de colección, principalmente palmas, cicádeas, helechos arborescentes y otras especies exóticas. Las descripciones, fotografías y especificaciones publicadas en el sitio web se proporcionan a título informativo y pueden variar ligeramente respecto al producto final debido a la naturaleza de los seres vivos.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 4. Precios y comisión de plataforma */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                4. Precios y comisión de plataforma
              </h2>
              <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
                <li>Los precios indicados incluyen el IVA vigente en España.</li>
                <li>Los gastos de envío se calculan en función del destino y del peso/volumen del pedido, y se muestran antes de confirmar el pago.</li>
                <li><strong className="text-foreground">Comisión de plataforma:</strong> se aplica una comisión del <strong className="text-foreground">6%</strong> sobre el precio de los productos, incluida en el precio final mostrado al cliente. Esta comisión cubre los costes de mantenimiento de la plataforma, procesamiento de pagos y soporte al cliente.</li>
                <li>LA EMPRESA se reserva el derecho de modificar los precios en cualquier momento, siendo aplicable el precio vigente en el momento de la compra.</li>
              </ul>
            </div>

            <Separator className="my-6" />

            {/* 5. Proceso de compra */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                5. Proceso de compra
              </h2>
              <ol className="space-y-2 text-muted-foreground text-sm list-decimal pl-5">
                <li>EL CLIENTE selecciona los productos y los añade al carrito.</li>
                <li>Accede al proceso de pago e introduce los datos de envío y facturación.</li>
                <li>Revisa el resumen del pedido y acepta las presentes condiciones.</li>
                <li>Realiza el pago a través de los métodos disponibles (tarjeta, Stripe).</li>
                <li>Recibe un correo electrónico de confirmación del pedido.</li>
              </ol>
              <p className="text-muted-foreground leading-relaxed mt-3">
                El contrato de compraventa se perfecciona en el momento en que LA EMPRESA confirma la aceptación del pedido.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 6. Métodos de pago */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                6. Métodos de pago
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Los pagos se realizan a través de la pasarela segura Stripe, que acepta tarjetas de crédito y débito (Visa, Mastercard, American Express). LA EMPRESA no almacena datos de tarjetas ni información bancaria.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 7. Envíos y entregas */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                7. Envíos y entregas
              </h2>
              <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
                <li>Los envíos se realizan a España peninsular, Baleares, Canarias y países de la Unión Europea.</li>
                <li>Los plazos de entrega estimados son de 3 a 7 días laborables en península y de 5 a 10 días en destinos internacionales.</li>
                <li>LA EMPRESA no se responsabiliza de retrasos causados por la empresa de transporte, condiciones meteorológicas adversas o circunstancias de fuerza mayor.</li>
                <li>Para más información, consulte nuestra página de <a href="/envios-y-entregas" className="text-primary hover:underline">Envíos y Entregas</a>.</li>
              </ul>
            </div>

            <Separator className="my-6" />

            {/* 8. Derecho de desistimiento */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                8. Derecho de desistimiento
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Conforme al artículo <strong className="text-foreground">103.d) del Real Decreto Legislativo 1/2007</strong> (Ley General para la Defensa de los Consumidores y Usuarios), las plantas vivas se consideran <strong className="text-foreground">bienes perecederos o que pueden caducar con rapidez</strong>, por lo que están <strong className="text-foreground">excluidas del derecho de desistimiento</strong> de 14 días previsto en la Directiva 2011/83/UE, artículo 16, apartado d).
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Al realizar un pedido, EL CLIENTE acepta expresamente esta exclusión, reconociendo que las plantas son productos vivos cuyo estado puede deteriorarse con el paso del tiempo.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong className="text-foreground">No obstante</strong>, si el producto llega dañado, en mal estado o no se corresponde con lo pedido, EL CLIENTE tiene derecho a reclamar conforme a la sección 9 (Devoluciones y reclamaciones).
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Para cualquier consulta, contacte con nosotros en: 📧 <a href="mailto:guillermocubells@gmail.com" className="text-primary hover:underline">guillermocubells@gmail.com</a>
              </p>
            </div>

            <Separator className="my-6" />

            {/* 9. Devoluciones y reclamaciones */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                9. Devoluciones y reclamaciones
              </h2>
              <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
                <li>Si el producto llega dañado o en mal estado, EL CLIENTE debe notificarlo en un plazo máximo de <strong className="text-foreground">48 horas</strong> desde la recepción, adjuntando fotografías del embalaje y del producto.</li>
                <li>LA EMPRESA evaluará cada caso y, si procede, ofrecerá un reenvío o el reembolso del importe.</li>
                <li>Los gastos de devolución serán a cargo de LA EMPRESA únicamente cuando el defecto sea imputable al vendedor o al transporte.</li>
              </ul>
            </div>

            <Separator className="my-6" />

            {/* 10. Garantía */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                10. Garantía
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Los productos ofrecidos por LA EMPRESA cumplen con la normativa de consumo vigente. Al tratarse de seres vivos, no existe garantía de supervivencia una vez entregado el producto, ya que esta depende de los cuidados y condiciones proporcionados por EL CLIENTE.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 11. Propiedad intelectual */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                11. Propiedad intelectual
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Todos los contenidos del sitio web (textos, imágenes, logotipos, diseño) son propiedad de LA EMPRESA o de sus legítimos titulares, y están protegidos por las leyes de propiedad intelectual e industrial. Queda prohibida su reproducción sin autorización expresa.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 12. Protección de datos */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                12. Protección de datos
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                El tratamiento de los datos personales se realiza conforme a nuestra <a href="/privacy" className="text-primary hover:underline">Política de Privacidad</a>.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 13. Legislación aplicable y jurisdicción */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                13. Legislación aplicable y jurisdicción
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Las presentes condiciones se rigen por la legislación española. Para la resolución de cualquier conflicto, las partes se someten a los juzgados y tribunales del domicilio del consumidor, siempre que EL CLIENTE tenga la condición de consumidor conforme al Real Decreto Legislativo 1/2007.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 14. Modificación de las condiciones */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                14. Modificación de las condiciones
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                LA EMPRESA se reserva el derecho de modificar las presentes Condiciones Generales de Venta en cualquier momento. Las modificaciones entrarán en vigor desde su publicación en el sitio web.
              </p>
            </div>

            <Separator className="my-6" />

            {/* 15. Contacto */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                15. Contacto
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Para cualquier consulta relacionada con las condiciones de venta:
              </p>
              <p className="text-muted-foreground mt-2">
                📧 <a href="mailto:guillermocubells@gmail.com" className="text-primary hover:underline">guillermocubells@gmail.com</a>
              </p>
              <p className="text-muted-foreground mt-1">
                📱 <a href={`https://wa.me/${STORE_CONTACT.whatsappNumber}`} className="text-primary hover:underline">{STORE_CONTACT.whatsappDisplay}</a> (WhatsApp)
              </p>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfSale;
