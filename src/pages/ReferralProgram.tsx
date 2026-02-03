import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";

const ReferralProgram = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Programa de Referidos | Frondaprima</title>
        <meta 
          name="description" 
          content="Comparte Frondaprima y gana crédito. Descubre cómo funciona nuestro programa de referidos." 
        />
        <link rel="canonical" href="https://frondaprima.lovable.app/programa-referidos" />
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <article className="max-w-3xl mx-auto prose prose-sm sm:prose-base prose-neutral dark:prose-invert">
          {/* Page Header */}
          <header className="text-center mb-10 md:mb-14 not-prose">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              Programa de Referidos Frondaprima
            </h1>
          </header>

          {/* Sección: ¿Cómo funciona? */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              ¿Cómo funciona?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Comparte Frondaprima con otras personas.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Si alguien nuevo llega a la plataforma a través de tu enlace y realiza su primera compra, recibirás un <strong className="text-foreground">5% del valor del pedido</strong> en crédito para tus futuras compras.
            </p>
          </section>

          <Separator className="my-6" />

          {/* Sección: ¿Qué obtengo? */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              ¿Qué obtengo?
            </h2>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
              <li><strong className="text-foreground">5%</strong> del valor del pedido del usuario referido</li>
              <li>Solo en su <strong className="text-foreground">primera compra</strong></li>
              <li>Crédito máximo por pedido: <strong className="text-foreground">100 €</strong></li>
              <li>El crédito se acumula en tu cuenta como <strong className="text-foreground">saldo Frondaprima</strong></li>
            </ul>
          </section>

          <Separator className="my-6" />

          {/* Sección: ¿Cómo uso mi saldo? */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              ¿Cómo uso mi saldo?
            </h2>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
              <li>El saldo puede utilizarse para <strong className="text-foreground">comprar plantas</strong> en Frondaprima</li>
              <li>Se puede usar hasta un <strong className="text-foreground">50%</strong> del valor de los productos del carrito</li>
              <li>El saldo <strong className="text-foreground">no puede utilizarse</strong> para gastos de envío</li>
              <li>El saldo no es dinero en efectivo, <strong className="text-foreground">no se puede retirar ni transferir</strong></li>
            </ul>
          </section>

          <Separator className="my-6" />

          {/* Sección: Cuándo se valida el crédito */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              Cuándo se valida el crédito
            </h2>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
              <li>El crédito se genera cuando el pedido del usuario referido está <strong className="text-foreground">pagado</strong></li>
              <li>El crédito pasa a estar disponible <strong className="text-foreground">7 días después</strong>, siempre que no haya incidencias o devoluciones</li>
            </ul>
          </section>

          <Separator className="my-6" />

          {/* Sección: Devoluciones y ajustes */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              Devoluciones y ajustes
            </h2>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
              <li>Si el pedido referido se devuelve total o parcialmente, el crédito generado se <strong className="text-foreground">ajustará o cancelará automáticamente</strong></li>
              <li>No se generan créditos sobre pedidos devueltos</li>
            </ul>
          </section>

          <Separator className="my-6" />

          {/* Sección: Condiciones importantes */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              Condiciones importantes
            </h2>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
              <li>Solo válido para <strong className="text-foreground">usuarios nuevos</strong></li>
              <li>Solo aplica al <strong className="text-foreground">primer pedido</strong></li>
              <li>No se permiten <strong className="text-foreground">autorreferidos</strong></li>
              <li>Frondaprima se reserva el derecho de <strong className="text-foreground">anular créditos</strong> en caso de uso indebido</li>
            </ul>
          </section>

          <Separator className="my-6" />

          {/* Sección: Transparencia */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              Transparencia
            </h2>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
              <li>Puedes consultar tus créditos y movimientos desde <strong className="text-foreground">tu cuenta</strong></li>
              <li>El historial de saldo es <strong className="text-foreground">visible y auditable</strong></li>
            </ul>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default ReferralProgram;
