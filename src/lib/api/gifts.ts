import {
  overflowGiftSchema,
  philanthropyGiftSchema,
  takealotGiftSchema,
} from '@/lib/dream-boards/schema';

export const serializeGiftData = (params: { giftType: string; giftData: unknown }) => {
  if (params.giftType === 'takealot_product') {
    const parsed = takealotGiftSchema.safeParse(params.giftData);
    if (!parsed.success) return null;
    return {
      product_url: parsed.data.productUrl,
      product_name: parsed.data.productName,
      product_image: parsed.data.productImage,
      product_price: parsed.data.productPrice,
    };
  }

  const parsed = philanthropyGiftSchema.safeParse(params.giftData);
  if (!parsed.success) return null;
  return {
    cause_id: parsed.data.causeId,
    cause_name: parsed.data.causeName,
    impact_description: parsed.data.impactDescription,
    amount_cents: parsed.data.amountCents,
  };
};

export const serializeOverflowGiftData = (overflowGiftData: unknown | null) => {
  if (!overflowGiftData) return null;
  const parsed = overflowGiftSchema.safeParse(overflowGiftData);
  if (!parsed.success) return null;
  return {
    cause_id: parsed.data.causeId,
    cause_name: parsed.data.causeName,
    impact_description: parsed.data.impactDescription,
  };
};
