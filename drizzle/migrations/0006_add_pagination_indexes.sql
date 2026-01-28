CREATE INDEX IF NOT EXISTS "idx_contributions_dream_board_created_at" ON "contributions" USING btree ("dream_board_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_payouts_status_created_at" ON "payouts" USING btree ("status","created_at");
