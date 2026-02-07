import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";

const ReferralProgram = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Programa de Referidos | The Remainder</title>
        <meta 
          name="description" 
          content="Comparte The Remainder y gana crédito. Descubre cómo funciona nuestro programa de referidos." 
        />
        <link rel="canonical" href="https://frondaprima.lovable.app/programa-referidos" />
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <article className="max-w-3xl mx-auto prose prose-sm sm:prose-base prose-neutral dark:prose-invert">
          {/* Page Header */}
          <header className="text-center mb-10 md:mb-14 not-prose">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t('referralProgram.title')}
            </h1>
          </header>


          {/* Sección: ¿Cómo funciona? */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              {t('referralProgram.sections.how')}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('referral.howItWorks', { min: '25€', percent: '5', max: '20€' })}
            </p>
          </section>

          <Separator className="my-6" />

          {/* Sección: ¿Qué obtengo? */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              {t('referralProgram.sections.what')}
            </h2>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
              <li><strong className="text-foreground">5%</strong> {t('referralProgram.sections.what_li1', 'del valor del pedido del usuario referido')}</li>
              <li>{t('referralProgram.sections.what_li2', 'Solo en su primera compra (mínimo 25 €)')}</li>
              <li>{t('referralProgram.sections.what_li3', 'Crédito máximo por pedido: 20 €')}</li>
              <li>{t('referralProgram.sections.what_li4', 'El crédito se acumula en tu cuenta como saldo The Remainder')}</li>
            </ul>
          </section>

          <Separator className="my-6" />

          {/* Sección: ¿Cómo uso mi saldo? */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              {t('referralProgram.sections.usage')}
            </h2>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
              <li>{t('referralProgram.sections.usage_li1', 'El saldo puede utilizarse para comprar plantas en Frondaprima')}</li>
              <li>{t('referralProgram.sections.usage_li2', 'Se puede usar hasta un 100% del valor de los productos del carrito')}</li>
              <li>{t('referralProgram.sections.usage_li3', 'El saldo no puede utilizarse para gastos de envío')}</li>
              <li>{t('referralProgram.sections.usage_li4', 'El saldo no es dinero en efectivo, no se puede retirar ni transferir')}</li>
            </ul>
          </section>

          <Separator className="my-6" />

          {/* Sección: Cuándo se valida el crédito */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              {t('referralProgram.sections.validation')}
            </h2>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
              <li>{t('referralProgram.sections.validation_li1', 'El crédito se genera cuando el pedido del usuario referido está pagado')}</li>
              <li>{t('referralProgram.sections.validation_li2', 'El crédito pasa a estar disponible 14 días después, siempre que no haya incidencias o devoluciones')}</li>
            </ul>
          </section>

          <Separator className="my-6" />

          {/* Sección: Devoluciones y ajustes */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              {t('referralProgram.sections.returns')}
            </h2>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
              <li>{t('referralProgram.sections.returns_li1', 'Si el pedido referido se devuelve total o parcialmente, el crédito generado se ajustará o cancelará automáticamente')}</li>
              <li>{t('referralProgram.sections.returns_li2', 'No se generan créditos sobre pedidos devueltos')}</li>
            </ul>
          </section>

          <Separator className="my-6" />

          {/* Sección: Condiciones importantes */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              {t('referralProgram.sections.conditions')}
            </h2>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
              <li>{t('referralProgram.sections.conditions_li1', 'Solo válido para usuarios nuevos')}</li>
              <li>{t('referralProgram.sections.conditions_li2', 'Solo aplica al primer pedido')}</li>
              <li>{t('referralProgram.sections.conditions_li3', 'No se permiten autorreferidos')}</li>
              <li>{t('referralProgram.sections.conditions_li4', 'Frondaprima se reserva el derecho de anular créditos en caso de uso indebido')}</li>
            </ul>
          </section>

          <Separator className="my-6" />

          {/* Sección: Transparencia */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-4">
              {t('referralProgram.sections.transparency')}
            </h2>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc pl-5">
              <li>{t('referralProgram.sections.transparency_li1', 'Puedes consultar tus créditos y movimientos desde tu cuenta')}</li>
              <li>{t('referralProgram.sections.transparency_li2', 'El historial de saldo es visible y auditable')}</li>
            </ul>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default ReferralProgram;
