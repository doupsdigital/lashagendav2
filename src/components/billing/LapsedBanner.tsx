import Link from 'next/link';
import { Lock } from 'lucide-react';

/** Faixa do acesso vencido (F11.7), em todas as telas do app: ela vê tudo,
 *  mas não muda nada até renovar. Leva ao card "Meu plano" do Início. */
export function LapsedBanner({ slug }: { slug: string }) {
  return (
    <div data-lapsed-banner className="print:hidden bg-rose-600 text-white">
      <div className="max-w-md mx-auto px-5 py-2.5 flex items-center gap-3">
        <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
        <p className="flex-1 min-w-0 text-[13px] leading-snug">
          <strong>Acesso vencido.</strong> O app está só para consulta.
        </p>
        <Link
          href={`/app/${slug}/inicio#plano`}
          className="shrink-0 h-8 px-3 rounded-lg bg-white text-rose-700 text-[13px] font-bold flex items-center"
        >
          Renovar
        </Link>
      </div>
    </div>
  );
}
