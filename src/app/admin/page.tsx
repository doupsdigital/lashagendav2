'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutGrid, ArrowRight, Palette, LogOut } from 'lucide-react';

export default function AdminHubPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-5 md:p-10">
      <div className="max-w-4xl mx-auto space-y-7">
        {/* Header */}
        <header className="pb-7 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
              Studio<span className="text-rose-400 font-normal italic">Menu</span>{' '}
              <span className="text-slate-500 font-sans font-normal text-xl">· Admin</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">Painel central de operação.</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </header>

        {/* Grid de Ferramentas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin/catalogos"
            className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition-all flex items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
                <LayoutGrid className="w-4 h-4" />
                <span>Catálogos & Pedidos</span>
              </div>
              <h2 className="font-bold text-white text-xl">Catálogos</h2>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Administração, criação e edição dos catálogos das clientes.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </Link>

          <Link
            href="/admin/showroom"
            className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition-all flex items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Palette className="w-4 h-4" />
                <span>Modelos & Vitrines</span>
              </div>
              <h2 className="font-bold text-white text-xl">Showroom & Modelos Oficiais</h2>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Ambiente de testes interno e links de vitrine por nicho para enviar às leads.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </Link>
        </div>
      </div>
    </main>
  );
}
