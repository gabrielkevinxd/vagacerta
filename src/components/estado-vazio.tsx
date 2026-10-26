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
    <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center">
      <p className="font-medium">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{detalhe}</p>
      {accao ? <div className="mt-3">{accao}</div> : null}
    </div>
  );
}
