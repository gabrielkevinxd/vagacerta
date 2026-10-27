"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { pt, enGB } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Idioma } from "@/lib/i18n";
import { buttonVariants } from "@/components/ui/button";

export function Calendar({
  className,
  idioma = "pt-PT",
  ...props
}: React.ComponentProps<typeof DayPicker> & { idioma?: Idioma }) {
  return (
    <DayPicker
      weekStartsOn={1}
      locale={idioma === "en" ? enGB : pt}
      className={cn("p-2", className)}
      classNames={{
        months: "relative flex flex-col gap-2",
        month: "space-y-2",
        month_caption: "flex h-8 items-center justify-center px-8 text-[13px]/5 font-medium",
        caption_label: "text-[13px]/5 font-medium",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "size-7"),
        button_next: cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "size-7"),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-center text-[11px]/4 font-medium text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "relative p-0 text-center text-[13px]/5",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100",
        ),
        selected: "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        today: "rounded-md bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-40",
        hidden: "invisible",
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-3.5" strokeWidth={1.75} />
          ) : (
            <ChevronRight className="size-3.5" strokeWidth={1.75} />
          ),
      }}
      {...props}
    />
  );
}
