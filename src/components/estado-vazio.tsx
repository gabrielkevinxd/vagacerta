import { Inbox } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function EstadoVazio({
  titulo,
  detalhe,
  accao,
}: {
  titulo: string;
  detalhe: string;
  accao?: React.ReactNode;
}) {
  return (
    <Empty className="superficie border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox className="size-5 text-muted-foreground" strokeWidth={1.75} />
        </EmptyMedia>
        <EmptyTitle className="text-sm font-medium">{titulo}</EmptyTitle>
        <EmptyDescription className="text-xs text-muted-foreground">{detalhe}</EmptyDescription>
      </EmptyHeader>
      {accao ? <EmptyContent>{accao}</EmptyContent> : null}
    </Empty>
  );
}
