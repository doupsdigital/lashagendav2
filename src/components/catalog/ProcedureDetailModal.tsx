'use client';

import React, { useEffect, useState } from 'react';
import { ProcedureItem } from '@/types/catalog';
import { ProcedureImage } from './ProcedureImage';
import { ProcedureImageGallery } from './ProcedureImageGallery';
import { durationToLabel, priceToLabel, procedurePriceLabel, procedureWithVariation } from '@/lib/service-format';

interface ProcedureDetailModalProps {
  item: ProcedureItem;
  clientName?: string;
  whatsappNumber: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  bookingEnabled?: boolean;
  onBook?: (item: ProcedureItem) => void;
  /** Só o showroom em modo "Básico" usa isso — em vez do link real de
   *  WhatsApp (que abriria o WhatsApp de verdade na gravação), mostra a
   *  simulação visual (`FakeWhatsappScreen`). */
  onFakeWhatsapp?: (item: ProcedureItem) => void;
}

export const ProcedureDetailModal: React.FC<ProcedureDetailModalProps> = ({
  item,
  clientName = 'Mariana',
  whatsappNumber,
  onClose,
  onPrev,
  onNext,
  bookingEnabled = false,
  onBook,
  onFakeWhatsapp,
}) => {
  // Galeria em tela cheia (pedido real, 2026-10-22) — estado próprio, local
  // a este componente: não é um dos modais do editor visual (`activeModal`
  // em CatalogLayout.tsx, que é exclusivo do modo de edição) nem precisa
  // ser conhecido por `ProcedureGrid.tsx` — só empilha visualmente por cima
  // deste modal enquanto estiver aberto.
  const [galleryOpen, setGalleryOpen] = useState(false);
  const photos = [item.image_url, ...(item.extra_photos || [])].filter((url): url is string => Boolean(url));

  // Variações (F3.2): a cliente escolhe uma antes de agendar. Com uma só, já
  // vem marcada. As setas ← → trocam o `item` sem desmontar o modal, por isso
  // a escolha é refeita quando muda o serviço.
  const variations = item.variations || [];
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(
    variations.length === 1 ? variations[0].id : null
  );
  useEffect(() => {
    const list = item.variations || [];
    setSelectedVariationId(list.length === 1 ? list[0].id : null);
  }, [item.id, item.variations]);
  const selectedVariation = variations.find((v) => v.id === selectedVariationId) || null;
  const needsVariationChoice = variations.length > 0 && !selectedVariation;
  // O que segue para o agendamento/WhatsApp: o serviço ou a variação escolhida.
  const bookingTarget = selectedVariation ? procedureWithVariation(item, selectedVariation) : item;

  // Lock body scroll when modal is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // Enquanto a galeria (empilhada por cima) está aberta, ignora o Esc
    // aqui — ela tem o próprio listener e deve fechar primeiro. Sem essa
    // guarda, os dois listeners de `window` disparavam juntos no mesmo
    // Esc e fechavam os dois modais de uma vez (bug real, 2026-10-22).
    const handleKeyDown = (e: KeyboardEvent) => {
      if (galleryOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, galleryOpen]);

  // Investimento e Duração sempre saem dos números do serviço; os `specs`
  // (Manutenção, Efeito Visual…) entram depois. Com variações, cada opção
  // já mostra a própria duração e preço — as duas linhas saem.
  const getSpecs = (): [string, string][] => [
    ...(variations.length > 0
      ? []
      : ([
          ['Investimento', procedurePriceLabel(item)],
          ['Duração', durationToLabel(item.duration_minutes)],
        ] as [string, string][])),
    ...(item.specs || []),
  ];

  const firstName = clientName?.trim() ? clientName.trim().split(' ')[0] : '';
  const greeting = firstName ? `Olá, ${firstName}!` : 'Olá!';
  const messageText = encodeURIComponent(
    `${greeting} Estava vendo seu catálogo digital e gostaria de agendar o procedimento: *${bookingTarget.title}*.`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${messageText}`;

  const canBook =
    bookingEnabled && item.bookable !== false && !!bookingTarget.duration_minutes && bookingTarget.duration_minutes > 0;

  return (
    <div className="modal-detalhe" role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="modal-detalhe__backdrop" onClick={onClose} />
      <div className="modal-detalhe__sheet">
        <div className="modal__foto-wrap">
          <ProcedureImage src={item.image_url} alt={item.title} className="modal__foto" variant="detail" clientName={clientName} />
          <div className="modal__scrim" />
          <button
            type="button"
            className="modal__fechar"
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </button>
          {/* Só aparece quando há foto de verdade (pedido real, 2026-10-23) —
           *  sem isso, procedimentos sem foto (placeholder "imagens em
           *  breve") mostravam o botão mesmo sem nada pra ver em tela
           *  cheia; clicar não fazia nada (`ProcedureImageGallery` recusa
           *  renderizar com `photos` vazio). */}
          {photos.length > 0 && (
            <button
              type="button"
              className="modal__ver-imagem"
              onClick={() => setGalleryOpen(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Ver {photos.length > 1 ? 'imagens' : 'imagem'}
            </button>
          )}
        </div>

        <div className="modal__corpo">
          {item.category && <span className="modal__cat">{item.category}</span>}
          <h3 className="modal__titulo">{item.title}</h3>
          {item.description && <p className="modal__desc">{item.description}</p>}

          {variations.length > 0 && (
            <div className="modal__opcoes" role="radiogroup" aria-label="Escolha uma opção">
              <span className="modal__opcoes-titulo">Escolha uma opção</span>
              {variations.map((v) => {
                const checked = v.id === selectedVariationId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    className={`modal__opcao${checked ? ' is-selected' : ''}`}
                    onClick={() => setSelectedVariationId(v.id)}
                  >
                    <span className="modal__opcao-marca" aria-hidden="true" />
                    <span className="modal__opcao-nome">{v.name}</span>
                    <span className="modal__opcao-info">
                      <span className="modal__opcao-preco">{priceToLabel(v.price)}</span>
                      <span className="modal__opcao-duracao">{durationToLabel(v.duration_minutes)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {getSpecs().length > 0 && (
            <div className="modal__specs">
              {getSpecs().map(([k, v]) => (
                <div key={k} className="modal__spec">
                  <span className="modal__spec-k">{k}</span>
                  <span className="modal__spec-v">{v}</span>
                </div>
              ))}
            </div>
          )}

          <div className="modal__acoes">
            {/* Navegar pros outros procedimentos sem fechar o modal (pedido
             *  real, 2026-10-23) — só aparece em cada direção quando dá pra
             *  ir (ver `selectedProcedureIndex` em `ProcedureGrid.tsx`): 1º
             *  item só mostra "próximo", último só mostra "anterior". */}
            {onPrev && (
              <button
                type="button"
                className="modal__anterior"
                title="Ver procedimento anterior"
                onClick={onPrev}
              >
                ←
              </button>
            )}
            {/* Texto fixo, sem o nome do serviço (bug real reportado,
             *  2026-09-23): nome já aparece bem visível no título do modal
             *  logo acima — repetir ali dentro do botão era redundante e,
             *  pra nomes longos ("Alongamento em Gel + Esmaltação"), estourava
             *  a altura fixa do botão (48px) e quebrava numa segunda linha
             *  apertada. Texto curto nunca quebra, não importa o tamanho do
             *  nome do serviço. */}
            {needsVariationChoice ? (
              <button type="button" className="modal__cta" disabled>
                Escolha uma opção
              </button>
            ) : canBook ? (
              <button
                type="button"
                className="modal__cta"
                onClick={() => onBook?.(bookingTarget)}
              >
                Agendar agora →
              </button>
            ) : onFakeWhatsapp ? (
              <button
                type="button"
                className="modal__cta"
                onClick={() => onFakeWhatsapp(bookingTarget)}
              >
                Agendar agora →
              </button>
            ) : (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="modal__cta"
              >
                Agendar agora →
              </a>
            )}
            {onNext && (
              <button
                type="button"
                className="modal__proximo"
                title="Ver próximo procedimento"
                onClick={onNext}
              >
                →
              </button>
            )}
          </div>
        </div>
      </div>

      {galleryOpen && <ProcedureImageGallery photos={photos} onClose={() => setGalleryOpen(false)} />}
    </div>
  );
};
