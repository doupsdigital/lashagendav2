import { NicheType, CatalogOrderData } from '@/types/catalog';
import { lashPreset } from './lash';

export { lashPreset } from './lash';

export const nichePresetsMap: Record<NicheType, CatalogOrderData> = {
  lash: lashPreset,
};
