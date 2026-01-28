-- Dream boards with computed totals view
CREATE OR REPLACE VIEW dream_boards_with_totals AS
SELECT
  db.id,
  db.slug,
  db.partner_id,
  db.host_id,
  db.child_name,
  db.child_photo_url,
  db.birthday_date,
  db.gift_type,
  db.gift_data,
  db.goal_cents,
  db.payout_method,
  db.overflow_gift_data,
  db.message,
  db.deadline,
  db.status,
  db.payout_email,
  db.created_at,
  db.updated_at,
  COALESCE(SUM(c.net_cents) FILTER (WHERE c.payment_status = 'completed'), 0) AS raised_cents,
  COUNT(c.id) FILTER (WHERE c.payment_status = 'completed') AS contribution_count,
  GREATEST(0, COALESCE(SUM(c.net_cents) FILTER (WHERE c.payment_status = 'completed'), 0) - db.goal_cents) AS overflow_cents
FROM dream_boards db
LEFT JOIN contributions c ON c.dream_board_id = db.id
GROUP BY db.id;

-- Expiring dream boards view (boards expiring within next 7 days)
CREATE OR REPLACE VIEW expiring_dream_boards AS
SELECT
  id,
  slug,
  child_name,
  deadline,
  status
FROM dream_boards
WHERE status = 'active'
  AND deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days';
