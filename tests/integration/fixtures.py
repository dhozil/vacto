"""Expected contract state fixtures for integration tests."""

TERMS = "Deliver 100 widgets by March 1st for 50 GEN"
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"
COMMIT = "a1b2c3d4"  # replaced at runtime in tests

ACTIVE_STATE_KEYS = [
    "status",
    "party_a",
    "party_b",
    "commit_a",
    "commit_b",
    "terms",
    "revealed_by",
    "statement_a",
    "statement_b",
    "who_won",
    "verdict",
    "reasoning",
    "clause_commits",
    "revealed_clauses",
]