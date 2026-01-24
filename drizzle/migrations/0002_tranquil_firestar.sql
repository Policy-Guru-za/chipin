ALTER TABLE "dream_boards" ADD COLUMN "karri_card_number" text;
--> statement-breakpoint
ALTER TABLE "dream_boards" ADD CONSTRAINT "karri_card_required" CHECK ("payout_method" != 'karri_card_topup' OR "karri_card_number" IS NOT NULL);