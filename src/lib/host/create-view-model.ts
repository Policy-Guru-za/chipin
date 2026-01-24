import type { DreamBoardDraft } from '@/lib/dream-boards/draft';

export type CreateFlowStep = 'child' | 'gift' | 'details' | 'review';

type GiftPreview = {
  title: string;
  subtitle?: string;
  imageUrl: string;
  priceLabel?: string;
};

export type CreateFlowViewModel = {
  step: CreateFlowStep;
  stepLabel: string;
  title: string;
  subtitle?: string;
  redirectTo?: string;
  childName?: string;
  childPhotoUrl?: string;
  giftPreview?: GiftPreview;
  giftTitle?: string;
  goalLabel?: string;
  message?: string;
};

const stepLabels: Record<CreateFlowStep, string> = {
  child: 'Step 1 of 4',
  gift: 'Step 2 of 4',
  details: 'Step 3 of 4',
  review: 'Step 4 of 4',
};

const getStepTitle = (step: CreateFlowStep, childName?: string) => {
  if (step === 'child') return 'Who’s the birthday star?';
  if (step === 'gift') {
    return childName ? `What’s ${childName}'s dream gift?` : 'What’s the dream gift?';
  }
  if (step === 'details') return 'Almost done!';
  return 'Review your Dream Board';
};

const getStepSubtitle = (step: CreateFlowStep) => {
  if (step === 'gift') return 'Choose one special item to fund.';
  return undefined;
};

const buildGiftPreview = (draft?: DreamBoardDraft): GiftPreview | undefined => {
  if (!draft?.giftData) return undefined;

  if (draft.giftData.type === 'takealot_product') {
    return {
      title: draft.giftData.productName,
      imageUrl: draft.giftData.productImage,
      priceLabel: `R${(draft.giftData.productPrice / 100).toFixed(2)}`,
    };
  }

  return {
    title: draft.giftData.causeName,
    subtitle: draft.giftData.impactDescription,
    imageUrl: draft.giftData.causeImage,
  };
};

const getGiftTitle = (draft?: DreamBoardDraft) => {
  if (!draft?.giftData) return undefined;
  return draft.giftData.type === 'takealot_product'
    ? draft.giftData.productName
    : draft.giftData.causeName;
};

const getGoalLabel = (draft?: DreamBoardDraft) => {
  if (!draft?.goalCents) return undefined;
  return `R${(draft.goalCents / 100).toFixed(2)}`;
};

const getCompletionState = (draft?: DreamBoardDraft | null) => {
  return {
    childComplete: [draft?.childName, draft?.birthdayDate, draft?.childPhotoUrl].every(Boolean),
    giftComplete: [draft?.giftType, draft?.giftData, draft?.goalCents].every(Boolean),
    detailsComplete: [draft?.payoutEmail, draft?.deadline, draft?.payoutMethod].every(Boolean),
  };
};

const redirectRules: Record<
  CreateFlowStep,
  Array<(completion: ReturnType<typeof getCompletionState>) => string | undefined>
> = {
  child: [],
  gift: [(completion) => (!completion.childComplete ? '/create/child' : undefined)],
  details: [(completion) => (!completion.giftComplete ? '/create/gift' : undefined)],
  review: [
    (completion) => (!completion.giftComplete ? '/create/gift' : undefined),
    (completion) => (!completion.detailsComplete ? '/create/details' : undefined),
  ],
};

const getRedirectTarget = (
  step: CreateFlowStep,
  completion: ReturnType<typeof getCompletionState>
) => {
  for (const rule of redirectRules[step]) {
    const target = rule(completion);
    if (target) return target;
  }
  return undefined;
};

export const buildCreateFlowViewModel = (params: {
  step: CreateFlowStep;
  draft?: DreamBoardDraft | null;
}): CreateFlowViewModel => {
  const { step, draft } = params;
  const completion = getCompletionState(draft);
  const redirectTo = getRedirectTarget(step, completion);

  return {
    step,
    stepLabel: stepLabels[step],
    title: getStepTitle(step, draft?.childName),
    subtitle: getStepSubtitle(step),
    redirectTo,
    childName: draft?.childName,
    childPhotoUrl: draft?.childPhotoUrl,
    giftPreview: buildGiftPreview(draft ?? undefined),
    giftTitle: getGiftTitle(draft ?? undefined),
    goalLabel: getGoalLabel(draft ?? undefined),
    message: draft?.message,
  };
};
