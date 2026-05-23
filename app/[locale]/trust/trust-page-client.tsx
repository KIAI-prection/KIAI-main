"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Shield, Lock, Scale, HelpCircle, FileText, Users } from "lucide-react";

export function TrustPageClient() {
  const t = useTranslations("trust");

  const features = [
    {
      icon: Shield,
      titleKey: "security.title",
      descKey: "security.description",
    },
    {
      icon: Lock,
      titleKey: "privacy.title",
      descKey: "privacy.description",
    },
    {
      icon: Scale,
      titleKey: "regulation.title",
      descKey: "regulation.description",
    },
    {
      icon: Users,
      titleKey: "transparency.title",
      descKey: "transparency.description",
    },
  ];

  const faqs = [
    { questionKey: "faq1.question", answerKey: "faq1.answer" },
    { questionKey: "faq2.question", answerKey: "faq2.answer" },
    { questionKey: "faq3.question", answerKey: "faq3.answer" },
    { questionKey: "faq4.question", answerKey: "faq4.answer" },
    { questionKey: "faq5.question", answerKey: "faq5.answer" },
  ];

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-foreground mb-4">{t("title")}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      {/* Trust Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {features.map((feature) => (
          <Card key={feature.titleKey} className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                <feature.icon className="h-6 w-6 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(feature.descKey)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-semibold text-foreground">{t("faqTitle")}</h2>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.questionKey}
              value={`item-${index}`}
              className="border border-border rounded-lg px-4"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                {t(faq.questionKey)}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t(faq.answerKey)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Legal Links */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">{t("legalTitle")}</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <a href="#" className="text-sm text-brand hover:underline">
            {t("termsOfService")}
          </a>
          <a href="#" className="text-sm text-brand hover:underline">
            {t("privacyPolicy")}
          </a>
          <a href="#" className="text-sm text-brand hover:underline">
            {t("riskDisclosure")}
          </a>
          <a href="#" className="text-sm text-brand hover:underline">
            {t("amlPolicy")}
          </a>
        </div>
      </Card>
    </div>
  );
}
