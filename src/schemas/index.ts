import { z } from 'zod';

// A robust function to parse numbers from strings that might contain
// pt-BR or en-US style separators. The last separator (dot or comma)
// is treated as the decimal separator.
const parseNumericString = (val: unknown): number => {
    if (val === null || val === undefined) return NaN;
    let str = String(val).trim();
    if (str === '') return NaN;

    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');

    if (lastComma > lastDot) {
        // Comma is the decimal separator, dots are for grouping.
        // e.g., "1.234,56" becomes "1234.56"
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        // Dot is the decimal separator, commas are for grouping.
        // e.g., "1,234.56" becomes "1234.56"
        str = str.replace(/,/g, '');
    } else {
        // Fallback for cases like "1,234" or "1.234" (treat as integer)
        // or "123,45" / "123.45"
        str = str.replace(',', '.');
    }
    const num = parseFloat(str);
    return isNaN(num) ? NaN : num;
};


const numericStringTransform = z.any().transform((val, ctx) => {
    const num = parseNumericString(val);
    if (isNaN(num)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Deve ser um número válido." });
        return z.NEVER;
    }
    return num;
});


export const poolSchema = z.object({
  id: z.string().optional(),
  platform: z.string({
    required_error: 'Plataforma é obrigatória.',
  }).min(1, 'Plataforma é obrigatória.'),
  newPlatform: z.string().optional(),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres.'),
  tokenA: z.string().min(1, 'Token A é obrigatório.'),
  tokenB: z.string().min(1, 'Token B é obrigatório.'),
  tokenAId: z.string().min(1, 'ID do Token A é obrigatório.'),
  tokenBId: z.string().min(1, 'ID do Token B é obrigatório.'),
  feeTier: z.string().min(1, 'Taxa de ganhos é obrigatória.'),
  rangeMin: numericStringTransform.refine(n => n >= 0, "Range mínimo deve ser positivo."),
  rangeMax: numericStringTransform.refine(n => n >= 0, "Range máximo deve ser positivo."),
  // Fields for the initial daily entry, only for creation
  initialPositionValueUSD: z.coerce.number().optional(),
  initialFeesAccumulatedTokenA: z.coerce.number().optional(),
  initialFeesAccumulatedTokenB: z.coerce.number().optional(),
}).refine(data => {
    if (data.platform === 'Outra' && (!data.newPlatform || data.newPlatform.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: 'Por favor, insira o nome da nova plataforma.',
    path: ['newPlatform'],
}).refine(data => {
  if (data.rangeMin !== undefined && data.rangeMax !== undefined) {
    return data.rangeMax > data.rangeMin;
  }
  return true;
}, {
    message: "Range máximo deve ser maior que o range mínimo.",
    path: ["rangeMax"],
}).superRefine((data, ctx) => {
    if (!data.id) { // Create mode
        if (data.initialPositionValueUSD === undefined || data.initialPositionValueUSD < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "O valor inicial da posição é obrigatório.",
                path: ['initialPositionValueUSD']
            });
        }
        if (data.initialFeesAccumulatedTokenA === undefined || data.initialFeesAccumulatedTokenA < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "As taxas iniciais do Token A são obrigatórias (pode ser 0).",
                path: ['initialFeesAccumulatedTokenA']
            });
        }
         if (data.initialFeesAccumulatedTokenB === undefined || data.initialFeesAccumulatedTokenB < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "As taxas iniciais do Token B são obrigatórias (pode ser 0).",
                path: ['initialFeesAccumulatedTokenB']
            });
        }
    }
});

export const dailyEntrySchema = z.object({
  id: z.string().optional(),
  poolId: z.string({ required_error: 'ID do Pool é obrigatório.' }),
  date: z.string().min(1, 'Data é obrigatória.'),
  positionValueUSD: z.coerce.number().min(0, 'Valor da posição deve ser positivo.'),
  feesAccumulatedTokenA: z.coerce.number().min(0, 'Taxas do Token A devem ser positivas.'),
  feesAccumulatedTokenB: z.coerce.number().min(0, 'Taxas do Token B devem ser positivas.'),
  feesWithdrawnUSD: z.coerce.number().min(0, 'Taxas sacadas deve ser um número positivo.').optional().nullable(),
  note: z.string().optional(),
  updatedAt: z.string().optional(),
});
