'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Faq } from '@/lib/types';

export function FaqList({ items, defaultOpen }: { items: Faq[]; defaultOpen?: number }) {
  if (!items.length) {
    return <p className="text-center text-muted-foreground">No questions yet.</p>;
  }
  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? `item-${defaultOpen}` : undefined}>
      {items.map((f, i) => (
        <AccordionItem
          key={f.id}
          value={`item-${i}`}
          className="rounded-2xl border border-border/60 bg-card/50 px-5 data-[state=open]:bg-card [&[data-state=open]]:shadow-soft mb-3"
        >
          <AccordionTrigger className="text-left font-display text-lg font-medium text-foreground hover:no-underline">
            {f.question}
          </AccordionTrigger>
          <AccordionContent className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {f.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
