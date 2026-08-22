/**
 * Professional sample agreement used by the demo / quick-fill.
 *
 * Deliberately written as numbered legal clauses separated by the canonical
 * clause separator (`\n---\n`) so the partial-reveal / clause-proof flow works
 * on the sample exactly as it does on user-authored terms.
 */

import { CLAUSE_SEPARATOR } from "./commitHash";

export const PROFESSIONAL_SAMPLE_TERMS = `
1. AGREEMENT AND PARTIES. This Agreement ("Agreement") is made effective as of the date of commitment between Provider ("Provider") and Client ("Client"), the two parties to this smart agreement. The parties agree that the terms below constitute the complete and binding terms of their engagement.
---
2. SCOPE OF SERVICES. Provider shall perform the services described in the Statement of Work accepted by both parties, using commercially reasonable skill and care, and in accordance with all applicable laws and professional standards.
---
3. DELIVERY AND ACCEPTANCE. Provider shall deliver the agreed deliverables on or before the agreed deadline. Client shall review and either accept or reject the deliverables in writing within ten (10) business days of delivery; failure to respond is deemed acceptance.
---
4. COMPENSATION AND PAYMENT. In consideration of the complete and satisfactory delivery of the deliverables, Client shall pay Provider the agreed fee in the agreed currency. Payment is due within fourteen (14) calendar days of acceptance and shall be remitted to the wallet designated by Provider.
---
5. CONFIDENTIALITY. Each party shall hold in strict confidence all non-public information disclosed by the other party, shall use such information solely for the purposes of this Agreement, and shall not disclose it to any third party without prior written consent. This obligation survives the termination of this Agreement.
---
6. REPRESENTATIONS AND WARRANTIES. Provider represents and warrants that the services will be performed in a professional manner and that the deliverables do not infringe the intellectual property rights of any third party. Client represents and warrants that it has the authority to enter into this Agreement and to accept the deliverables.
---
7. LIMITATION OF LIABILITY. Neither party shall be liable to the other for indirect, incidental, special, or consequential damages arising out of this Agreement, except in the case of a party's fraud, gross negligence, or willful misconduct.
---
8. TERM AND TERMINATION. This Agreement begins on the effective date and continues until the deliverables are accepted and payment is made in full. Either party may terminate this Agreement for material breach if the breach is not cured within seven (7) days of written notice.
---
9. GOVERNING LAW AND DISPUTE RESOLUTION. This Agreement is governed by the law agreed by the parties. Any dispute arising out of or relating to this Agreement that the parties cannot resolve by mutual agreement shall be settled by the impartial AI arbitration mechanism of the contract, and the ruling shall be final and binding on both parties.
---
10. ENTIRE AGREEMENT AND COMMITMENT. This Agreement, as evidenced by the committed digest, constitutes the entire agreement between the parties and supersedes all prior discussions and understandings. Both parties acknowledge that this document is the authoritative statement of their mutual obligations and that any modification requires a new agreement between the parties.
`.trim();

/** Loads the professional sample, optionally with a fresh salt. */
export function loadProfessionalSample(includeSalt = true): {
  terms: string;
  salt: string;
} {
  return {
    terms: PROFESSIONAL_SAMPLE_TERMS,
    salt: includeSalt ? randomSalt() : "",
  };
}

function randomSalt(): string {
  const arr = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function clauseCount(terms: string): number {
  return terms
    .split(CLAUSE_SEPARATOR)
    .map((c) => c.trim())
    .filter((c) => c.length > 0).length;
}

export default {
  PROFESSIONAL_SAMPLE_TERMS,
  loadProfessionalSample,
  clauseCount,
};