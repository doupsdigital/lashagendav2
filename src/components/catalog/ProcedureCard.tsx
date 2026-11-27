import React from 'react';
import { ProcedureItem } from '@/types/catalog';
import { ProcedureImage } from './ProcedureImage';
import { durationToLabel, procedurePriceLabel } from '@/lib/service-format';

interface ProcedureCardProps {
  item: ProcedureItem;
  whatsappNumber: string;
  clientName?: string;
  isEditMode?: boolean;
  onSelect?: (item: ProcedureItem) => void;
}

export const ProcedureCard: React.FC<ProcedureCardProps> = ({ item, whatsappNumber, clientName, isEditMode = false, onSelect }) => {
  const handleBooking = () => {
    if (isEditMode) return;
    if (onSelect) {
      onSelect(item);
      return;
    }
    const text = encodeURIComponent(`Olá! Gostaria de agendar o procedimento: *${item.title}* (${procedurePriceLabel(item)}).`);
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
  };

  return (
    <div
      className={`tile ${item.is_highlight ? 'tile--destaque' : ''} is-revealed ${isEditMode ? 'lm-service-card-wrapper' : ''}`}
      onClick={handleBooking}
    >
      <ProcedureImage src={item.image_url} alt={item.title} className="tile__foto" variant="tile" clientName={clientName} />
      <div className="tile__scrim"></div>
      <div className="tile__conteudo">
        {item.category && <span className="tile__cat">{item.category}</span>}
        <h3 className="tile__titulo">{item.title}</h3>
        <div className="tile__meta">
          <span className="tile__preco">{procedurePriceLabel(item)}</span>
          <span className="tile__duracao">{durationToLabel(item.duration_minutes)}</span>
        </div>
      </div>
    </div>
  );
};
