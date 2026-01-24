import { z } from 'zod';

export const takealotGiftSchema = z.object({
  type: z.literal('takealot_product'),
  productUrl: z.string().url(),
  productName: z.string().min(1),
  productImage: z.string().min(1),
  productPrice: z.number().int().positive(),
});

export const philanthropyGiftSchema = z.object({
  type: z.literal('philanthropy'),
  causeId: z.string().min(1),
  causeName: z.string().min(1),
  causeDescription: z.string().min(1),
  causeImage: z.string().min(1),
  impactDescription: z.string().min(1),
  amountCents: z.number().int().positive(),
});

export const overflowGiftSchema = z.object({
  causeId: z.string().min(1),
  causeName: z.string().min(1),
  impactDescription: z.string().min(1),
});

export const dreamBoardDraftSchema = z
  .object({
    childName: z.string().min(2),
    birthdayDate: z.string().min(1),
    childPhotoUrl: z.string().url(),
    giftType: z.enum(['takealot_product', 'philanthropy']),
    giftData: z.union([takealotGiftSchema, philanthropyGiftSchema]),
    overflowGiftData: overflowGiftSchema.optional(),
    goalCents: z.number().int().positive(),
    payoutEmail: z.string().email(),
    payoutMethod: z.enum(['takealot_gift_card', 'karri_card_topup', 'philanthropy_donation']),
    karriCardNumberEncrypted: z.string().min(1).optional(),
    message: z.string().max(280).optional(),
    deadline: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.giftType !== value.giftData.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['giftData'],
        message: 'Gift data type does not match gift type',
      });
    }
    if (value.giftType === 'takealot_product' && !value.overflowGiftData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['overflowGiftData'],
        message: 'Overflow gift is required for Takealot gifts',
      });
    }
    if (value.giftType === 'philanthropy' && value.payoutMethod !== 'philanthropy_donation') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payoutMethod'],
        message: 'Payout method must be philanthropy_donation',
      });
    }
    if (value.payoutMethod === 'karri_card_topup' && !value.karriCardNumberEncrypted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['karriCardNumberEncrypted'],
        message: 'Karri card number is required',
      });
    }
  });

export type DreamBoardDraftPayload = z.infer<typeof dreamBoardDraftSchema>;
