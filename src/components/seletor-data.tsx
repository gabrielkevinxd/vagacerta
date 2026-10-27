"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { useT } from "@/components/idioma/provedor";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatarDataLocale } from "@/lib/i18n/formatacao";
import type { Idioma } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function isoDeData(data: Date): string {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dataDeIso(iso?: string): Date | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d);
}

export function SeletorData({
  name,
  id,
  valor,
  defaultValue,
  onChange,
  required,
  disabled,
  className,
  idioma: idiomaProp,
}: {
  name?: string;
  id?: string;
  valor?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  idioma?: Idioma;
}) {
  const { t, idioma: idiomaCtx } = useT();
  const idioma = idiomaProp ?? idiomaCtx;
  const controlado = valor !== undefined;
  const [interno, setInterno] = useState(defaultValue ?? "");
  const [aberto, setAberto] = useState(false);
  const atual = controlado ? valor : interno;
  const selecionada = dataDeIso(atual);

  const escolher = (data: Date | undefined) => {
    if (!data) return;
    const iso = isoDeData(data);
    if (!controlado) setInterno(iso);
    onChange?.(iso);
    setAberto(false);
  };

  return (
    <div className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={atual} required={required} /> : null}
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-8 w-full justify-start gap-2 px-2.5 font-normal tabular-nums",
              !atual && "text-muted-foreground",
            )}
          >
            <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            {atual ? formatarDataLocale(atual, idioma) : t("comum.data")}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            idioma={idioma}
            selected={selecionada}
            defaultMonth={selecionada}
            onSelect={escolher}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
