CREATE OR REPLACE FUNCTION "reject_finance_ledger_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'FinanceLedgerEntry is append-only and cannot be mutated'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "FinanceLedgerEntry_reject_update" ON "FinanceLedgerEntry";
DROP TRIGGER IF EXISTS "FinanceLedgerEntry_reject_delete" ON "FinanceLedgerEntry";
DROP TRIGGER IF EXISTS "FinanceLedgerEntry_reject_truncate" ON "FinanceLedgerEntry";

CREATE TRIGGER "FinanceLedgerEntry_reject_update"
BEFORE UPDATE ON "FinanceLedgerEntry"
FOR EACH ROW
EXECUTE FUNCTION "reject_finance_ledger_mutation"();

CREATE TRIGGER "FinanceLedgerEntry_reject_delete"
BEFORE DELETE ON "FinanceLedgerEntry"
FOR EACH ROW
EXECUTE FUNCTION "reject_finance_ledger_mutation"();

CREATE TRIGGER "FinanceLedgerEntry_reject_truncate"
BEFORE TRUNCATE ON "FinanceLedgerEntry"
FOR EACH STATEMENT
EXECUTE FUNCTION "reject_finance_ledger_mutation"();
