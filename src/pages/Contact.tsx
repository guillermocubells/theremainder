import { useState } from "react";
import { PageSEO } from "@/components/seo";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Phone, Mail, Clock, Send, Loader2, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";

const contactSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  subject: z.string().trim().min(3, "El asunto debe tener al menos 3 caracteres").max(200),
  message: z.string().trim().min(10, "El mensaje debe tener al menos 10 caracteres").max(2000),
  orderNumber: z.string().optional(),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: "Debes aceptar la política de privacidad"
  }),
});

type ContactFormData = z.infer<typeof contactSchema>;

const Contact = () => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
      orderNumber: "",
      acceptPrivacy: false,
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    
    // Simulate API call - in production, this would send to an edge function
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Form data submitted — integrate with backend edge function in production
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    
    toast({
      title: t("contact.success.title"),
      description: t("contact.success.message"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Contacto"
        description="Contacta con The Remainder. Resuelve tus dudas sobre pedidos, envíos y cuidados de plantas."
        path="/contact"
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Page Header */}
        <div className="text-center mb-10 md:mb-14">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t("contact.title")}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("contact.subtitle")}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* Left Column - Map & Contact Info */}
          <div className="space-y-6">
            {/* Map Embed */}
            <Card className="overflow-hidden border-border">
              <div className="aspect-[4/3] w-full">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d-3.7037902!3d40.4167754!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDI1JzAwLjQiTiAzwrA0MicxMy42Ilc!5e0!3m2!1ses!2ses!4v1600000000000!5m2!1ses!2ses"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación The Remainder"
                  className="w-full h-full"
                />
              </div>
            </Card>

            {/* Contact Information */}
            <Card className="border-border">
              <CardContent className="p-6 space-y-5">
                <h2 className="font-semibold text-lg text-foreground">
                  {t("contact.info.title")}
                </h2>
                
                <div className="space-y-4">
                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-moss/10 rounded-lg shrink-0">
                      <MapPin className="h-4 w-4 text-moss" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {t("contact.info.address")}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        The Remainder<br />
                        Calle del Jardín Botánico, 15<br />
                        28014 Madrid, España
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-moss/10 rounded-lg shrink-0">
                      <Phone className="h-4 w-4 text-moss" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {t("contact.info.phone")}
                      </p>
                      <a 
                        href="tel:+34912345678" 
                        className="text-muted-foreground text-sm hover:text-moss transition-colors"
                      >
                        +34 912 345 678
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-moss/10 rounded-lg shrink-0">
                      <Mail className="h-4 w-4 text-moss" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {t("contact.info.email")}
                      </p>
                      <a 
                         href="mailto:info@theremainder.com" 
                         className="text-muted-foreground text-sm hover:text-moss transition-colors"
                       >
                         info@theremainder.com
                      </a>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-moss/10 rounded-lg shrink-0">
                      <Clock className="h-4 w-4 text-moss" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {t("contact.info.hours")}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {t("contact.info.hoursDetail")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Hint */}
            <Card className="border-border bg-muted/30">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{t("contact.faqHint.title")}</strong>{" "}
                  {t("contact.faqHint.description")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Contact Form */}
          <div>
            <Card className="border-border">
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg text-foreground mb-5">
                  {t("contact.form.title")}
                </h2>

                {isSubmitted ? (
                  <div className="text-center py-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-moss/10 rounded-full mb-4">
                      <CheckCircle2 className="h-8 w-8 text-moss" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {t("contact.success.title")}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {t("contact.success.message")}
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsSubmitted(false);
                        form.reset();
                      }}
                    >
                      {t("contact.success.sendAnother")}
                    </Button>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      {/* Name */}
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("common.form.name")} *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={t("common.form.namePlaceholder")} 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Email */}
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("common.form.email")} *</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder={t("common.form.emailPlaceholder")} 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Order Number (optional) */}
                      <FormField
                        control={form.control}
                        name="orderNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("contact.form.orderNumber")}</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={t("contact.form.orderNumberPlaceholder")} 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Subject */}
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("contact.form.subject")} *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={t("contact.form.subjectPlaceholder")} 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Message */}
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("contact.form.message")} *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder={t("contact.form.messagePlaceholder")}
                                className="min-h-[140px] resize-none"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* GDPR Info */}
                      <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
                        <p><strong className="text-foreground">{t("contact.gdpr.responsible")}:</strong> The Remainder S.L.</p>
                        <p><strong className="text-foreground">{t("contact.gdpr.purpose")}:</strong> {t("contact.gdpr.purposeText")}</p>
                        <p><strong className="text-foreground">{t("contact.gdpr.legitimation")}:</strong> {t("contact.gdpr.legitimationText")}</p>
                        <p><strong className="text-foreground">{t("contact.gdpr.recipients")}:</strong> {t("contact.gdpr.recipientsText")}</p>
                        <p><strong className="text-foreground">{t("contact.gdpr.rights")}:</strong> {t("contact.gdpr.rightsText")}</p>
                      </div>

                      {/* Privacy Checkbox */}
                      <FormField
                        control={form.control}
                        name="acceptPrivacy"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {t("contact.form.acceptPrivacy")}{" "}
                                <a 
                                  href="/privacy" 
                                  className="text-moss hover:underline"
                                  target="_blank"
                                >
                                  {t("contact.form.privacyLink")}
                                </a>
                                . *
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* Submit Button */}
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("contact.form.sending")}
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            {t("contact.form.submit")}
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
