// Aba "Saúde e cuidados" da ficha da cliente (F8.2) — perguntas exatamente do
// v1 (`FichaAnamneseDetalhe.tsx`), com as mesmas chaves de lá. Fica em
// `client_records.health` (jsonb). Dado pessoal SENSÍVEL (LGPD): nunca sai do
// app — nada de pixel, URL, evento ou log com esses textos. Puro: sem imports.

export interface HealthYesNoField {
  kind: 'yesno';
  key: string;
  label: string;
  /** Só aparece (e só é gravada) quando esta outra pergunta é "Sim". */
  onlyIf?: string;
}

export interface HealthTextField {
  kind: 'text';
  key: string;
  label: string;
  placeholder: string;
  max: number;
  multiline?: boolean;
}

export type HealthField = HealthYesNoField | HealthTextField;

export interface HealthSection {
  title: string;
  fields: HealthField[];
}

export const MAX_HEALTH_TEXT = 500;
export const MAX_HEALTH_NOTES = 1000;

export const HEALTH_SECTIONS: HealthSection[] = [
  {
    title: 'Histórico e cuidados com os olhos',
    fields: [
      { kind: 'yesno', key: 'fez_extensao_antes', label: 'Já realizou extensão de cílios anteriormente?' },
      { kind: 'yesno', key: 'reacao_alergica_anterior', label: 'Teve reação alérgica a extensões anteriores?', onlyIf: 'fez_extensao_antes' },
      { kind: 'yesno', key: 'usa_lentes_contato', label: 'Usa lentes de contato?' },
      { kind: 'yesno', key: 'olhos_sensiveis', label: 'Olhos sensíveis, lacrimejamento fácil ou olho seco?' },
      { kind: 'yesno', key: 'doencas_oculares', label: 'Infecção ocular recente (blefarite, conjuntivite, terçol)?' },
      { kind: 'yesno', key: 'habito_esfregar_olhos', label: 'Hábito de esfregar ou tocar os olhos/cílios?' },
    ],
  },
  {
    title: 'Condições e fatores hormonais',
    fields: [
      { kind: 'yesno', key: 'gestante', label: 'Gestante ou Lactante?' },
      { kind: 'yesno', key: 'problemas_tireoide', label: 'Problemas de tireoide ou alteração hormonal recente?' },
      { kind: 'yesno', key: 'quimioterapia_recente', label: 'Passou por quimioterapia nos últimos 6 meses?' },
      { kind: 'yesno', key: 'queda_cabelo_alopecia', label: 'Queda acentuada de cabelo ou diagnóstico de alopecia?' },
    ],
  },
  {
    title: 'Alergias e detalhes',
    fields: [
      {
        kind: 'text',
        key: 'alergias',
        label: 'Alergias conhecidas',
        placeholder: 'Ex.: esmalte, cosméticos, cianoacrilato (cola), fita micropore, látex...',
        max: MAX_HEALTH_TEXT,
        multiline: true,
      },
      {
        kind: 'text',
        key: 'medicamentos',
        label: 'Medicamentos em uso',
        placeholder: 'Ex.: Roacutan, colírios frequentes, corticoides...',
        max: MAX_HEALTH_TEXT,
        multiline: true,
      },
      {
        kind: 'text',
        key: 'doencas_cronicas',
        label: 'Doenças crônicas',
        placeholder: 'Ex.: diabetes, labirintite (dificulta ficar deitada muito tempo), asma...',
        max: MAX_HEALTH_TEXT,
        multiline: true,
      },
      {
        kind: 'text',
        key: 'observacoes',
        label: 'Notas gerais',
        placeholder: 'Qualquer observação adicional relevante sobre a cliente...',
        max: MAX_HEALTH_NOTES,
        multiline: true,
      },
    ],
  },
];

export const HEALTH_FIELDS: HealthField[] = HEALTH_SECTIONS.flatMap((s) => s.fields);

export type HealthSheet = Record<string, string | boolean>;

export type CleanHealthResult = { ok: true; data: HealthSheet } | { ok: false; message: string };

/** Valida o que veio do formulário. Vazio some; pergunta dependente só fica se
 *  a pergunta-mãe é "Sim". Chaves de fora são ignoradas. */
export function cleanHealth(input: unknown): CleanHealthResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, message: 'Ficha inválida.' };
  const raw = input as Record<string, unknown>;
  const data: HealthSheet = {};
  for (const field of HEALTH_FIELDS) {
    const value = raw[field.key];
    if (value === undefined || value === null || value === '') continue;
    if (field.kind === 'yesno') {
      if (typeof value !== 'boolean') return { ok: false, message: `Resposta inválida em "${field.label}".` };
      data[field.key] = value;
    } else {
      if (typeof value !== 'string') return { ok: false, message: `Texto inválido em "${field.label}".` };
      const text = value.replace(/\r\n/g, '\n').trim();
      if (!text) continue;
      if (text.length > field.max) return { ok: false, message: `"${field.label}" pode ter até ${field.max} caracteres.` };
      data[field.key] = text;
    }
  }
  for (const field of HEALTH_FIELDS) {
    if (field.kind === 'yesno' && field.onlyIf && data[field.onlyIf] !== true) delete data[field.key];
  }
  return { ok: true, data };
}

/** Lê o jsonb do banco sem confiar nele (descarta o que não bate). */
export function readHealth(stored: unknown): HealthSheet {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  // Campo a campo (um valor ruim não derruba os outros), mas sem a regra da
  // pergunta-mãe aqui — ela é aplicada no fim, com todos os campos juntos.
  const data: HealthSheet = {};
  for (const field of HEALTH_FIELDS) {
    const value = (stored as Record<string, unknown>)[field.key];
    const r = cleanHealth({ [field.key]: value, ...(field.kind === 'yesno' && field.onlyIf ? { [field.onlyIf]: true } : {}) });
    if (r.ok && field.key in r.data) data[field.key] = r.data[field.key];
  }
  const clean = cleanHealth(data);
  return clean.ok ? clean.data : {};
}

export function countHealthFilled(sheet: HealthSheet): number {
  return HEALTH_FIELDS.filter((f) => sheet[f.key] !== undefined).length;
}

/** Quantas respostas pedem atenção: "Sim" em alguma pergunta (menos "já fez
 *  extensão", que não é alerta) ou alergia/medicamento/doença escritos. */
export function countHealthAlerts(sheet: HealthSheet): number {
  return HEALTH_FIELDS.filter((f) => {
    if (f.kind === 'yesno') return f.key !== 'fez_extensao_antes' && sheet[f.key] === true;
    return f.key !== 'observacoes' && typeof sheet[f.key] === 'string';
  }).length;
}
