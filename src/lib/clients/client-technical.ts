// Ficha técnica da cliente (F8.1) — campos e opções exatamente do v1
// (`FichaAnamneseDetalhe.tsx`), com as mesmas chaves do `anamnese_lash` de lá.
// Fica em `client_records.technical` (jsonb). Puro: sem imports.

export interface TechOption {
  value: string;
  label: string;
}

export interface TechChoiceField {
  kind: 'choice';
  key: string;
  label: string;
  options: TechOption[];
}

export interface TechYesNoField {
  kind: 'yesno';
  key: string;
  label: string;
}

export interface TechDaysField {
  kind: 'days';
  key: string;
  label: string;
  placeholder: string;
}

export interface TechTextField {
  kind: 'text';
  key: string;
  label: string;
  placeholder: string;
  max: number;
  multiline?: boolean;
}

export type TechField = TechChoiceField | TechYesNoField | TechDaysField | TechTextField;

export interface TechSection {
  title: string;
  fields: TechField[];
}

export const MAX_TECH_DAYS = 365;
export const MAX_TECH_LENGTH_TEXT = 40;
export const MAX_TECH_NOTES = 1000;

export const TECH_SECTIONS: TechSection[] = [
  {
    title: 'Perfil do olho e cílios naturais',
    fields: [
      {
        kind: 'choice',
        key: 'formato_olho',
        label: 'Formato do olho',
        options: [
          { value: 'amendoado', label: 'Amendoado' },
          { value: 'redondo', label: 'Redondo' },
          { value: 'caido', label: 'Caído' },
          { value: 'fundo', label: 'Fundo' },
          { value: 'protruso', label: 'Protruso' },
          { value: 'monolid', label: 'Monolid' },
        ],
      },
      {
        kind: 'choice',
        key: 'espacamento_olhos',
        label: 'Espaçamento entre os olhos',
        options: [
          { value: 'proximos', label: 'Próximos' },
          { value: 'afastados', label: 'Afastados' },
          { value: 'normal', label: 'Normal' },
        ],
      },
      {
        kind: 'choice',
        key: 'densidade_cilios_naturais',
        label: 'Densidade dos cílios naturais',
        options: [
          { value: 'ralos', label: 'Ralos' },
          { value: 'medios', label: 'Médios' },
          { value: 'densos', label: 'Densos' },
        ],
      },
      {
        kind: 'choice',
        key: 'comprimento_cilios_naturais',
        label: 'Comprimento dos cílios naturais',
        options: [
          { value: 'curtos', label: 'Curtos' },
          { value: 'medios', label: 'Médios' },
          { value: 'longos', label: 'Longos' },
        ],
      },
      {
        kind: 'choice',
        key: 'curvatura_natural',
        label: 'Curvatura natural',
        options: [
          { value: 'retos', label: 'Retos' },
          { value: 'levemente_curvados', label: 'Levemente curvados' },
          { value: 'bem_curvados', label: 'Bem curvados' },
        ],
      },
    ],
  },
  {
    title: 'Preferências técnicas',
    fields: [
      {
        kind: 'choice',
        key: 'tecnica_preferida',
        label: 'Técnica preferida',
        options: [
          { value: 'fio_a_fio_classico', label: 'Fio a Fio Clássico' },
          { value: 'volume_russo', label: 'Volume Russo' },
          { value: 'hibrido', label: 'Híbrido' },
          { value: 'volume_brasileiro', label: 'Volume Brasileiro' },
          { value: 'mega_volume', label: 'Mega Volume' },
        ],
      },
      {
        kind: 'choice',
        key: 'mapping_preferido',
        label: 'Mapping preferido',
        options: [
          { value: 'natural', label: 'Natural' },
          { value: 'gatinho', label: 'Gatinho (Cat Eye)' },
          { value: 'boneca', label: 'Boneca (Dolly Eye)' },
          { value: 'esquilo', label: 'Esquilo (Squirrel)' },
          { value: 'aberto_no_meio', label: 'Aberto no Meio' },
        ],
      },
      {
        kind: 'choice',
        key: 'curvatura_preferida',
        label: 'Curvatura preferida',
        options: [
          { value: 'J', label: 'J' },
          { value: 'B', label: 'B' },
          { value: 'C', label: 'C' },
          { value: 'CC', label: 'CC' },
          { value: 'D', label: 'D' },
          { value: 'DD_L', label: 'D+ / L' },
          { value: 'L_plus_M', label: 'L+ / M' },
        ],
      },
      {
        kind: 'choice',
        key: 'espessura_preferida',
        label: 'Espessura preferida',
        options: [
          { value: '0.03', label: '0.03mm' },
          { value: '0.05', label: '0.05mm' },
          { value: '0.07', label: '0.07mm' },
          { value: '0.10', label: '0.10mm' },
          { value: '0.15', label: '0.15mm' },
          { value: '0.20', label: '0.20mm' },
        ],
      },
      { kind: 'text', key: 'comprimento_predominante', label: 'Comprimento predominante', placeholder: 'Ex.: 8-13mm', max: MAX_TECH_LENGTH_TEXT },
      {
        kind: 'choice',
        key: 'efeito_desejado',
        label: 'Efeito desejado',
        options: [
          { value: 'natural', label: 'Natural' },
          { value: 'glamouroso', label: 'Glamouroso' },
          { value: 'boneca', label: 'Boneca' },
          { value: 'marcante', label: 'Marcante' },
        ],
      },
    ],
  },
  {
    title: 'Retenção e cuidados',
    fields: [
      {
        kind: 'choice',
        key: 'posicao_dormir',
        label: 'Como costuma dormir?',
        options: [
          { value: 'lado', label: 'De Lado (impacta lateral da extensão)' },
          { value: 'costas', label: 'De Costas (ideal para retenção)' },
          { value: 'de_brucos', label: 'De Bruços (atrito severo)' },
          { value: 'variada', label: 'Variada / Alternada' },
        ],
      },
      { kind: 'days', key: 'tempo_medio_retencao_dias', label: 'Tempo médio de retenção', placeholder: 'Ex.: 21' },
      { kind: 'days', key: 'frequencia_manutencao_dias', label: 'Frequência ideal de manutenção', placeholder: 'Ex.: 15' },
      {
        kind: 'choice',
        key: 'tipo_adesivo',
        label: 'Adesivo mais adequado',
        options: [
          { value: 'sensivel', label: 'Sensível / Hipoalergênico' },
          { value: 'padrao', label: 'Padrão' },
          { value: 'secagem_rapida', label: 'Secagem Rápida' },
        ],
      },
      { kind: 'yesno', key: 'maquiagem_prova_agua', label: "Usa rímel ou maquiagem à prova d'água?" },
      { kind: 'yesno', key: 'exposicao_calor_agua', label: 'Contato frequente com vapor, calor ou piscina?' },
      {
        kind: 'text',
        key: 'observacoes_retencao',
        label: 'Observações',
        placeholder: 'Ex.: perde mais fios no canto externo. Boa retenção no geral.',
        max: MAX_TECH_NOTES,
        multiline: true,
      },
    ],
  },
];

export const TECH_FIELDS: TechField[] = TECH_SECTIONS.flatMap((s) => s.fields);

/** Ficha gravada: só os campos preenchidos (escolha = valor da opção,
 *  sim/não = boolean, dias = inteiro, texto = string). */
export type TechnicalSheet = Record<string, string | number | boolean>;

export type CleanTechnicalResult = { ok: true; data: TechnicalSheet } | { ok: false; message: string };

/** Valida o que veio do formulário. Campo vazio some; opção que não existe,
 *  dias fora de 1–365 ou texto longo demais recusam tudo. Chaves que não são
 *  da ficha técnica são ignoradas. */
export function cleanTechnical(input: unknown): CleanTechnicalResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, message: 'Ficha inválida.' };
  const raw = input as Record<string, unknown>;
  const data: TechnicalSheet = {};
  for (const field of TECH_FIELDS) {
    const value = raw[field.key];
    if (value === undefined || value === null || value === '') continue;
    if (field.kind === 'choice') {
      if (typeof value !== 'string' || !field.options.some((o) => o.value === value)) {
        return { ok: false, message: `Opção inválida em "${field.label}".` };
      }
      data[field.key] = value;
    } else if (field.kind === 'yesno') {
      if (typeof value !== 'boolean') return { ok: false, message: `Resposta inválida em "${field.label}".` };
      data[field.key] = value;
    } else if (field.kind === 'days') {
      const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;
      if (!Number.isInteger(n) || n < 1 || n > MAX_TECH_DAYS) {
        return { ok: false, message: `"${field.label}": use um número de dias entre 1 e ${MAX_TECH_DAYS}.` };
      }
      data[field.key] = n;
    } else {
      if (typeof value !== 'string') return { ok: false, message: `Texto inválido em "${field.label}".` };
      const text = field.multiline ? value.replace(/\r\n/g, '\n').trim() : value.replace(/\s+/g, ' ').trim();
      if (!text) continue;
      if (text.length > field.max) return { ok: false, message: `"${field.label}" pode ter até ${field.max} caracteres.` };
      data[field.key] = text;
    }
  }
  return { ok: true, data };
}

/** Lê o jsonb do banco sem confiar nele: descarta o que não bate com a ficha
 *  (dado antigo ou mexido à mão não quebra a tela). */
export function readTechnical(stored: unknown): TechnicalSheet {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  const data: TechnicalSheet = {};
  for (const field of TECH_FIELDS) {
    const r = cleanTechnical({ [field.key]: (stored as Record<string, unknown>)[field.key] });
    if (r.ok && field.key in r.data) data[field.key] = r.data[field.key];
  }
  return data;
}

export function countTechnicalFilled(sheet: TechnicalSheet): number {
  return TECH_FIELDS.filter((f) => sheet[f.key] !== undefined).length;
}

function optionLabel(key: string, sheet: TechnicalSheet): string | null {
  const field = TECH_FIELDS.find((f) => f.key === key);
  const value = sheet[key];
  if (!field || field.kind !== 'choice' || typeof value !== 'string') return null;
  return field.options.find((o) => o.value === value)?.label ?? null;
}

/** Resumo curto do que ela costuma fazer: "Volume Russo · Gatinho (Cat Eye) ·
 *  C 0.07 · 8-13mm". Null se nenhum desses campos está preenchido. */
export function technicalSummary(sheet: TechnicalSheet): string | null {
  const curl = optionLabel('curvatura_preferida', sheet);
  const thickness = typeof sheet.espessura_preferida === 'string' ? sheet.espessura_preferida : null;
  const parts = [
    optionLabel('tecnica_preferida', sheet),
    optionLabel('mapping_preferido', sheet),
    [curl, thickness].filter(Boolean).join(' ') || null,
    typeof sheet.comprimento_predominante === 'string' ? sheet.comprimento_predominante : null,
    optionLabel('efeito_desejado', sheet),
  ].filter((p): p is string => Boolean(p));
  return parts.length ? parts.join(' · ') : null;
}
