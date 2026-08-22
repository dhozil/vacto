/**
 * Contract templates — reusable clause-based agreement skeletons.
 *
 * Terms are built from clauses separated by the canonical clause separator
 * (`\n---\n`) so the partial-reveal proof flow works on templates too.
 * Placeholders use the `{{variable}}` syntax so users fill in their specifics
 * before committing.
 */

import { CLAUSE_SEPARATOR } from "./commitHash";

export interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
}

export interface ContractTemplate {
  id: string;
  name: string;
  tagline: string;
  fields: TemplateField[];
  clauses: string[]; // each clause may contain {{placeholders}}
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "service-delivery",
    name: "Service Delivery",
    tagline: "Deliver a defined scope by a deadline for payment",
    fields: [
      { key: "provider", label: "Provider", placeholder: "Party A", required: true },
      { key: "client", label: "Client", placeholder: "Party B", required: true },
      { key: "scope", label: "Scope of work", placeholder: "Deliver 100 widgets", required: true },
      { key: "deliveryDate", label: "Delivery deadline", placeholder: "March 1st", required: true },
      { key: "amount", label: "Payment amount", placeholder: "50", required: true },
      { key: "currency", label: "Currency", placeholder: "GEN", required: true },
    ],
    clauses: [
      "SCOPE OF DELIVERY. Provider {{provider}} shall deliver, and Client {{client}} shall accept, the following goods or services: {{scope}}.",
      "DELIVERY DATE. Delivery shall be completed on or before {{deliveryDate}}, and time is of the essence with respect to this obligation.",
      "COMPENSATION. In consideration of full and satisfactory delivery, Client {{client}} shall pay Provider {{provider}} the sum of {{amount}} {{currency}}.",
      "PAYMENT TERMS. Payment shall be due within fourteen (14) calendar days of delivery confirmation and shall be remitted to the provider's designated wallet.",
      "DISPUTE RESOLUTION. Either party may raise a dispute under the agreed commit/reveal terms if the delivery or payment obligations are not met, and the matter shall be resolved by impartial AI arbitration.",
      "ENTIRE AGREEMENT. Both parties acknowledge that this agreement is governed by the terms above, which constitute the complete and binding understanding of the parties.",
    ],
  },
  {
    id: "freelance",
    name: "Freelance Engagement",
    tagline: "Independent contractor for a defined piece of work",
    fields: [
      { key: "freelancer", label: "Freelancer", placeholder: "Party A", required: true },
      { key: "client", label: "Client", placeholder: "Party B", required: true },
      { key: "project", label: "Project / deliverable", placeholder: "Website redesign", required: true },
      { key: "dueDate", label: "Due date", placeholder: "June 30th", required: true },
      { key: "rate", label: "Total fee", placeholder: "2000", required: true },
      { key: "currency", label: "Currency", placeholder: "GEN", required: true },
      { key: "revisions", label: "Revisions included", placeholder: "2", required: false },
    ],
    clauses: [
      "ENGAGEMENT. Freelancer {{freelancer}} is engaged as an independent contractor by Client {{client}} for the following project: {{project}}.",
      "DELIVERY. The deliverable for the project shall be completed and delivered on or before {{dueDate}}.",
      "COMPENSATION. The total fee for the engagement is {{rate}} {{currency}}, payable upon Client's acceptance of the deliverable.",
      "REVISIONS. The engagement includes {{revisions}} revision round(s); any additional revisions are outside the agreed scope and are not covered by the fee.",
      "RELATIONSHIP. No employer-employee relationship is created by this Agreement, and Freelancer is solely responsible for its own taxes and obligations.",
      "DISPUTE RESOLUTION. Any dispute over acceptance, scope, or payment arising from this engagement shall be resolved under the agreed arbitration terms.",
    ],
  },
  {
    id: "payment-promise",
    name: "Payment Promise",
    tagline: "An unconditional payment obligation",
    fields: [
      { key: "debtor", label: "Debtor", placeholder: "Party A", required: true },
      { key: "creditor", label: "Creditor", placeholder: "Party B", required: true },
      { key: "amount", label: "Amount", placeholder: "1000", required: true },
      { key: "currency", label: "Currency", placeholder: "GEN", required: true },
      { key: "dueDate", label: "Due date", placeholder: "April 15th", required: true },
      { key: "lateFee", label: "Late fee (optional)", placeholder: "5%", required: false },
    ],
    clauses: [
      "PROMISE TO PAY. Debtor {{debtor}} hereby unconditionally promises to pay Creditor {{creditor}} the sum of {{amount}} {{currency}} on or before {{dueDate}}.",
      "UNCONDITIONAL OBLIGATION. This payment obligation is absolute and unconditional and is not subject to any counterclaim, set-off, or defense.",
      "LATE PAYMENT. If payment is not received by the due date, a late fee of {{lateFee}} shall apply to the outstanding balance and shall accrue until paid in full.",
      "EVIDENCE AND ENFORCEMENT. Debtor acknowledges that this promise is evidenced by the committed terms and is enforceable through the agreed arbitration process.",
    ],
  },
  {
    id: "mutual-nda",
    name: "Mutual Confidentiality",
    tagline: "Both parties protect shared business information",
    fields: [
      { key: "party", label: "Party A", placeholder: "Party A", required: true },
      { key: "counterparty", label: "Party B", placeholder: "Party B", required: true },
      { key: "term", label: "Confidentiality term", placeholder: "12 months", required: true },
      { key: "jurisdiction", label: "Governing law", placeholder: "The laws of the forum agreed by the parties", required: false },
    ],
    clauses: [
      "CONFIDENTIALITY OBLIGATION. Party {{party}} and Party {{counterparty}} agree to protect the confidentiality of all business information disclosed between them.",
      "COVERED INFORMATION. Confidential information includes business plans, customer data, pricing, financial data, and technical details disclosed during the relationship.",
      "DURATION. This confidentiality obligation shall remain in effect for {{term}} following the disclosure of any confidential information.",
      "NON-DISCLOSURE. Neither party shall disclose confidential information to any third party without the disclosing party's prior written consent, except as required by law.",
      "PARTIAL PROOF. Either party may prove a specific obligation under this agreement using the partial-reveal mechanism without disclosing the full agreement.",
      "GOVERNING LAW. This agreement is governed by {{jurisdiction}}.",
    ],
  },
];

/** Collect every field key mentioned in the template's clauses. */
export function templateFieldKeys(template: ContractTemplate): string[] {
  return Array.from(new Set(template.fields.map((f) => f.key)));
}

/** Capitalize the first letter of a value so rendered clauses read cleanly. */
function capitalize(value: string): string {
  const v = value.trim();
  if (!v) return "";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/** Render a template into terms text by substituting {{placeholders}}. */
export function renderTemplate(
  template: ContractTemplate,
  values: Record<string, string>
): string {
  const clauses = template.clauses.map((clause) => {
    return clause.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
      const val = capitalize(values[key] ?? "");
      return val || `{{${key}}}`;
    });
  });
  return clauses.join(CLAUSE_SEPARATOR);
}

/** True when every required field has a non-empty value. */
export function hasAllRequiredFields(
  template: ContractTemplate,
  values: Record<string, string>
): boolean {
  return template.fields
    .filter((f) => f.required)
    .every((f) => (values[f.key]?.trim() ?? "") !== "");
}

/** Human-readable hint for fields still missing in the rendered output. */
export function unresolvedPlaceholders(terms: string): string[] {
  const matches = Array.from(terms.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1]);
  return Array.from(new Set(matches));
}

export default {
  CONTRACT_TEMPLATES,
  renderTemplate,
  hasAllRequiredFields,
  unresolvedPlaceholders,
  templateFieldKeys,
};