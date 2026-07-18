-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic document numbering — replaces COUNT(*)+1 race condition
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Counter table (one row per team-root / doc-type pair)
CREATE TABLE IF NOT EXISTS doc_counters (
  owner_id  uuid NOT NULL,
  doc_type  text NOT NULL,
  counter   int  NOT NULL DEFAULT 0,
  PRIMARY KEY (owner_id, doc_type)
);

-- Direct access blocked; only the SECURITY DEFINER function touches this table.
ALTER TABLE doc_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_direct_access" ON doc_counters TO authenticated USING (false) WITH CHECK (false);

-- 2. Atomic increment function
--    INSERT first counter for a new owner/type → returns 1
--    Existing counter → atomically increments and returns new value
CREATE OR REPLACE FUNCTION next_doc_number(p_owner_id uuid, p_doc_type text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counter int;
BEGIN
  INSERT INTO doc_counters (owner_id, doc_type, counter)
  VALUES (p_owner_id, p_doc_type, 1)
  ON CONFLICT (owner_id, doc_type)
  DO UPDATE SET counter = doc_counters.counter + 1
  RETURNING counter INTO v_counter;
  RETURN v_counter;
END;
$$;

-- Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION next_doc_number(uuid, text) TO authenticated;
-- Allow service role (used by API routes / admin client)
GRANT EXECUTE ON FUNCTION next_doc_number(uuid, text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Seed from existing data so numbering continues seamlessly
--    Resolves team root: if the creator has a team_owner_id, counter lives
--    under the owner; otherwise under their own user_id.
-- ─────────────────────────────────────────────────────────────────────────────

-- Estimates
INSERT INTO doc_counters (owner_id, doc_type, counter)
SELECT
  COALESCE(p.team_owner_id, e.user_id) AS owner_id,
  'estimate'                            AS doc_type,
  MAX(
    CASE WHEN e.estimate_number ~ '^EST-[0-9]+$'
    THEN CAST(SUBSTRING(e.estimate_number FROM 5) AS int)
    ELSE 0 END
  )                                     AS counter
FROM estimates e
LEFT JOIN profiles p ON p.id = e.user_id
WHERE e.estimate_number ~ '^EST-[0-9]+$'
GROUP BY COALESCE(p.team_owner_id, e.user_id)
ON CONFLICT (owner_id, doc_type) DO UPDATE
  SET counter = GREATEST(doc_counters.counter, EXCLUDED.counter);

-- Invoices
INSERT INTO doc_counters (owner_id, doc_type, counter)
SELECT
  COALESCE(p.team_owner_id, i.user_id) AS owner_id,
  'invoice'                             AS doc_type,
  MAX(
    CASE WHEN i.invoice_number ~ '^INV-[0-9]+$'
    THEN CAST(SUBSTRING(i.invoice_number FROM 5) AS int)
    ELSE 0 END
  )                                     AS counter
FROM invoices i
LEFT JOIN profiles p ON p.id = i.user_id
WHERE i.invoice_number ~ '^INV-[0-9]+$'
GROUP BY COALESCE(p.team_owner_id, i.user_id)
ON CONFLICT (owner_id, doc_type) DO UPDATE
  SET counter = GREATEST(doc_counters.counter, EXCLUDED.counter);
