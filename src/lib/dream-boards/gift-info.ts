export type TakealotGiftData = {
  productName?: string;
  productImage?: string;
};

export type PhilanthropyGiftData = {
  causeName?: string;
  causeImage?: string;
  impactDescription?: string;
};

type GiftInfoParams = {
  giftType: 'takealot_product' | 'philanthropy';
  giftData: unknown;
  takealotSubtitle?: string;
};

const resolveTakealotGift = (params: GiftInfoParams) =>
  params.giftType === 'takealot_product' ? (params.giftData as TakealotGiftData) : null;

const resolvePhilanthropyGift = (params: GiftInfoParams) =>
  params.giftType === 'philanthropy' ? (params.giftData as PhilanthropyGiftData) : null;

const resolveGiftTitle = (
  takealotGift: TakealotGiftData | null,
  philanthropyGift: PhilanthropyGiftData | null
) => takealotGift?.productName ?? philanthropyGift?.causeName ?? '';

const resolveGiftSubtitle = (
  takealotGift: TakealotGiftData | null,
  philanthropyGift: PhilanthropyGiftData | null,
  takealotSubtitle?: string
) =>
  takealotGift ? (takealotSubtitle ?? 'Dream gift') : (philanthropyGift?.impactDescription ?? '');

const resolveGiftImage = (
  takealotGift: TakealotGiftData | null,
  philanthropyGift: PhilanthropyGiftData | null
) => takealotGift?.productImage ?? philanthropyGift?.causeImage ?? '';

export const getGiftInfo = (params: GiftInfoParams) => {
  const takealotGift = resolveTakealotGift(params);
  const philanthropyGift = resolvePhilanthropyGift(params);

  const giftTitle = resolveGiftTitle(takealotGift, philanthropyGift);
  const giftSubtitle = resolveGiftSubtitle(takealotGift, philanthropyGift, params.takealotSubtitle);
  const giftImage = resolveGiftImage(takealotGift, philanthropyGift);

  return {
    takealotGift,
    philanthropyGift,
    giftTitle,
    giftSubtitle,
    giftImage,
  };
};
