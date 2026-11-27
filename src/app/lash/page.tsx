import type { Metadata } from 'next';
import { LashSelfServeEntry } from '@/components/self-serve/LashSelfServeEntry';

export const metadata: Metadata = {
  title: 'LashAgenda — Catálogo e agendamento para Lash Designers',
  description: 'Digite seu nome e veja seu Catálogo Digital de Lash Designer pronto em segundos. Grátis, sem cadastro.',
  openGraph: {
    title: 'Veja o seu Catálogo Digital de Lash Designer pronto em segundos',
    description: 'Digite seu nome e veja como fica. Grátis, sem cadastro.',
    type: 'website',
  },
};

/** Página de vendas de autosserviço do nicho Lash (2026-11-17). O mesmo
 *  conteúdo também é servido em `/?nicho=lash` (link do anúncio atual). */
export default function LashSelfServePage() {
  return <LashSelfServeEntry />;
}
