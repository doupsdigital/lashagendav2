'use client';

import React from 'react';
import { Printer } from 'lucide-react';

/** Abre a janela de impressão do navegador (cartão do QR, F10.3). */
export const PrintButton: React.FC = () => (
  <button
    type="button"
    onClick={() => window.print()}
    className="w-full h-12 rounded-xl bg-rose-600 text-white text-[15px] font-bold flex items-center justify-center gap-2"
  >
    <Printer className="w-4 h-4" /> Imprimir
  </button>
);
