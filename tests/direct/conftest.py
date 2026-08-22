"""Shared helpers for direct mode tests."""
import hashlib
import hmac
import os
import sys


def to_hex(addr_bytes):
    """Convert address bytes to checksummed hex matching contract output.

    Call after direct_deploy so the SDK is on sys.path.
    """
    if hasattr(addr_bytes, "as_hex"):
        return addr_bytes.as_hex
    from genlayer.py.types import Address

    return Address(addr_bytes).as_hex


def commit_hash(terms: str, salt: str) -> str:
    """Mirror of the contract's keyed commit: HMAC-SHA256 keyed by the salt.

    The salt is treated as a high-entropy secret shared off-chain; an on-chain
    observer cannot brute-force the terms from the digest without it.
    """
    return hmac.new(salt.encode("utf-8"), terms.encode("utf-8"), hashlib.sha256).hexdigest()


CLAUDE_SEPARATOR = "\n---\n"


def split_clauses(terms: str):
    """Mirror of the contract's clause segmentation (documented in README)."""
    return [c.strip() for c in terms.split(CLAUDE_SEPARATOR) if c.strip()]


def clause_hash(clause: str, salt: str, index: int) -> str:
    """Per-clause digest: HMAC-SHA256 keyed by f"{salt}#{index}"."""
    key = f"{salt}#{index}".encode("utf-8")
    return hmac.new(key, clause.encode("utf-8"), hashlib.sha256).hexdigest()


def mark_evidence_both(vm, contract, party_a, party_b, urls_a=None, urls_b=None):
    """Complete BOTH parties' evidence input (empty list => "no evidence").

    Cooperative resolution requires each party to call submit_evidence(). This
    helper is the shared setup for tests that then call resolve_dispute().
    """
    vm.sender = party_a
    contract.submit_evidence(urls_a if urls_a is not None else [])
    vm.sender = party_b
    contract.submit_evidence(urls_b if urls_b is not None else [])


def _patch_win32_stdin_tmpfile_unlink() -> None:
    """Workaround: genlayer-test direct mode injects the calldata message via
    a temp file redirected onto stdin, then calls os.unlink() on it while the
    handle is still open. That is fine on POSIX but raises PermissionError on
    Windows. Swallowing the error is safe — the OS reclaims the temp file.
    """
    if sys.platform != "win32":
        return
    try:
        import gltest.direct.loader as loader
    except Exception:
        return

    original = os.unlink

    def _guarded_unlink(path, *args, **kwargs):
        try:
            original(path, *args, **kwargs)
        except OSError:
            pass

    # The loader imports `os` lazily; both refer to the same global module,
    # so patching os.unlink itself is sufficient.
    os.unlink = _guarded_unlink


_patch_win32_stdin_tmpfile_unlink()