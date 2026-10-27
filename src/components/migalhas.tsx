"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useT } from "@/components/idioma/provedor";
import { useRotulosMigalha } from "@/components/migalhas-contexto";
import { migalhasDeCaminho } from "@/lib/migalhas";

export function Migalhas() {
  const pathname = usePathname() || "/";
  const { t } = useT();
  const { rotulos } = useRotulosMigalha();
  const estrutura = migalhasDeCaminho(pathname);
  const migalhas = estrutura.map((miga) => ({
    href: miga.href,
    rotulo: rotulos[miga.href] ?? (miga.rotuloFixo ? miga.rotuloFixo : t(miga.rotuloChave!)),
  }));

  return (
    <Breadcrumb className="hidden min-w-0 flex-1 sm:block">
      <BreadcrumbList className="text-[13px]/5">
        {migalhas.map((miga, indice) => (
          <span key={miga.href} className="contents">
            {indice > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {indice === migalhas.length - 1 ? (
                <BreadcrumbPage className="font-medium">{miga.rotulo}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={miga.href}>{miga.rotulo}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
