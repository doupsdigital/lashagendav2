'use client';

import React, { useState } from 'react';
import { X, SquarePlus, EllipsisVertical, Download, Check, Copy, ExternalLink } from 'lucide-react';

export type InstallHelpPlatform = 'ios' | 'android' | 'in-app';

interface InstallHelpSheetProps {
  platform: InstallHelpPlatform;
  onClose: () => void;
}

/** Ícone de Compartilhar do iOS (quadrado com seta saindo por cima) — não
 *  existe pronto no lucide-react, e é o que a profissional precisa reconhecer
 *  na barra do navegador. */
const IosShareIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 16V4" />
    <path d="M8 8l4-4 4 4" />
    <rect x="5" y="10" width="14" height="10" rx="2" />
  </svg>
);

interface Step {
  icon: React.FC<{ className?: string }>;
  title: string;
  desc: string;
}

const CONTENT: Record<InstallHelpPlatform, { intro: string; steps: Step[] }> = {
  ios: {
    intro: 'No iPhone, a instalação é feita pelo próprio Safari — são 3 toques:',
    steps: [
      {
        icon: IosShareIcon,
        title: 'Toque em Compartilhar',
        desc: 'O quadrado com a seta pra cima. No iOS 26, ele fica dentro dos três pontinhos (•••) ao lado do endereço.',
      },
      {
        icon: SquarePlus,
        title: 'Adicionar à Tela de Início',
        desc: 'Role a lista até essa opção. Se não aparecer, toque em "Ver mais".',
      },
      {
        icon: Check,
        title: 'Toque em Adicionar',
        desc: 'Se aparecer "Abrir como App Web", deixe ligado. O ícone do LashAgenda vai pra sua tela de início.',
      },
    ],
  },
  android: {
    intro: 'No Android, a instalação é feita pelo menu do navegador — são 3 toques:',
    steps: [
      {
        icon: EllipsisVertical,
        title: 'Toque nos três pontinhos',
        desc: 'O menu ⋮ no canto de cima do navegador.',
      },
      {
        icon: Download,
        title: 'Instalar app',
        desc: 'Em alguns celulares o nome é "Adicionar à tela inicial".',
      },
      {
        icon: Check,
        title: 'Confirme em Instalar',
        desc: 'O ícone do LashAgenda aparece junto dos seus outros apps.',
      },
    ],
  },
  'in-app': {
    intro: 'Você abriu este link por dentro de outro app (como o Instagram), e por ali o celular não deixa instalar.',
    steps: [
      {
        icon: EllipsisVertical,
        title: 'Abra no navegador',
        desc: 'Toque nos três pontinhos do app e escolha "Abrir no navegador" (ou "Abrir no Safari" / "Abrir no Chrome").',
      },
      {
        icon: Download,
        title: 'Toque em Instalar de novo',
        desc: 'Lá no Safari ou no Chrome, o botão Instalar do topo mostra o passo a passo. Se pedir, entre com seu e-mail e senha.',
      },
    ],
  },
};

/** Passo a passo de instalação (F12.2): iPhone (a Apple não tem diálogo de
 *  instalação — só pelo menu Compartilhar), Android sem o diálogo do Chrome
 *  (outro navegador, ou o Chrome ainda não ofereceu) e navegador de dentro de
 *  outro app, onde não dá para instalar. Aberto pelo botão "Instalar" do
 *  `PageTitleBar`. */
export const InstallHelpSheet: React.FC<InstallHelpSheetProps> = ({ platform, onClose }) => {
  const { intro, steps } = CONTENT[platform];
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" data-install-help={platform}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface rounded-t-3xl p-6 pb-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-linen text-ink-soft flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-serif-pro text-xl font-bold text-ink mb-1 pr-8">Instalar o app</h3>
        <p className="text-[15px] text-ink-soft mb-5">{intro}</p>

        <div className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <div key={step.title} className="flex items-center gap-3.5 rounded-xl bg-cream p-3.5">
              <div className="shrink-0 w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <step.icon className="shrink-0 w-6 h-6 text-rose-600" />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">{step.title}</p>
                <p className="text-sm text-ink-soft">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {platform === 'in-app' ? (
          <button
            type="button"
            onClick={copyAddress}
            className="w-full h-11 mt-5 rounded-xl bg-rose-600 text-white text-[15px] font-bold flex items-center justify-center gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Endereço copiado — cole no navegador' : 'Copiar o endereço'}
          </button>
        ) : (
          <p className="mt-4 text-xs text-ink-soft flex items-start gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Se a opção não aparecer, abra este endereço direto no {platform === 'ios' ? 'Safari' : 'Chrome'}.
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className={`w-full h-11 mt-3 rounded-xl text-[15px] font-bold ${platform === 'in-app' ? 'bg-linen text-ink' : 'bg-rose-600 text-white'}`}
        >
          Entendi
        </button>
      </div>
    </div>
  );
};
