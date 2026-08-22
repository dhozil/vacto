import { describe, it, expect } from "vitest";
import {
  CONTRACT_TEMPLATES,
  renderTemplate,
  hasAllRequiredFields,
  unresolvedPlaceholders,
  templateFieldKeys,
} from "../lib/contracts/templates";
import { CLAUSE_SEPARATOR, splitClauses } from "../lib/contracts/commitHash";

describe("contract templates", () => {
  it("exposes at least the four curated templates", () => {
    const names = CONTRACT_TEMPLATES.map((t) => t.id);
    expect(names).toContain("service-delivery");
    expect(names).toContain("freelance");
    expect(names).toContain("payment-promise");
    expect(names).toContain("mutual-nda");
  });

  it("renders clauses joined by the canonical clause separator", () => {
    const tpl = CONTRACT_TEMPLATES[0];
    const terms = renderTemplate(tpl, { scope: "Deliver 100 widgets" });
    expect(terms.includes(CLAUSE_SEPARATOR)).toBe(true);
    expect(splitClauses(terms).length).toBe(tpl.clauses.length);
  });

  it("substitutes provided field values", () => {
    const tpl = CONTRACT_TEMPLATES.find((t) => t.id === "service-delivery")!;
    const terms = renderTemplate(tpl, {
      provider: "Alice",
      client: "Bob",
      scope: "101 widgets",
      deliveryDate: "March 1st",
      amount: "50",
      currency: "GEN",
    });
    expect(terms).toContain("SCOPE OF DELIVERY. Provider Alice shall deliver");
    expect(terms).toContain("Client Bob shall accept");
    expect(terms).toContain("101 widgets");
    expect(terms).toContain("the sum of 50 GEN.");
  });

  it("capitalizes the first letter of provided values", () => {
    const tpl = CONTRACT_TEMPLATES.find((t) => t.id === "service-delivery")!;
    const terms = renderTemplate(tpl, {
      provider: "isp",
      client: "myre",
      scope: "deliver 100",
      deliveryDate: "march 1",
      amount: "100",
      currency: "gen",
    });
    expect(terms).toContain("Provider Isp shall deliver"); // first letter capitalized
    expect(terms).toContain("Client Myre shall accept");
    expect(terms).toContain("on or before March 1,");
    expect(terms).toContain("the sum of 100 Gen.");
    expect(terms).toContain("goods or services: Deliver 100.");
  });

  it("is deterministic — identical input always yields identical terms and digest", async () => {
    const tpl = CONTRACT_TEMPLATES.find((t) => t.id === "service-delivery")!;
    const { computeCommitHash } = await import("../lib/contracts/commitHash");
    const salt = "s".repeat(16);
    const values = {
      provider: "isp",
      client: "myre",
      scope: "deliver 100",
      deliveryDate: "march 1",
      amount: "100",
      currency: "gen",
    };

    const a = renderTemplate(tpl, values);
    const b = renderTemplate(tpl, { ...values });
    expect(a).toBe(b);
    expect(await computeCommitHash(a, salt)).toBe(await computeCommitHash(b, salt));
  });

  it("leaves placeholders unresolved when values are missing", () => {
    const tpl = CONTRACT_TEMPLATES.find((t) => t.id === "payment-promise")!;
    const terms = renderTemplate(tpl, { amount: "100" });
    const unresolved = unresolvedPlaceholders(terms);
    expect(unresolved).toContain("debtor");
    expect(unresolved).toContain("creditor");
    expect(unresolved).not.toContain("amount");
  });

  it("reports all required fields present", () => {
    const tpl = CONTRACT_TEMPLATES.find((t) => t.id === "freelance")!;
    const full = {
      freelancer: "Alice",
      client: "Bob",
      project: "Website redesign",
      dueDate: "June 30th",
      rate: "2000",
      currency: "GEN",
    };
    expect(hasAllRequiredFields(tpl, full)).toBe(true);
    expect(hasAllRequiredFields(tpl, { ...full, project: "" })).toBe(false);
    expect(hasAllRequiredFields(tpl, {})).toBe(false);
  });

  it("collects field keys mentioned in clauses", () => {
    const tpl = CONTRACT_TEMPLATES.find((t) => t.id === "service-delivery")!;
    const keys = templateFieldKeys(tpl);
    for (const f of tpl.fields) {
      expect(keys).toContain(f.key);
    }
  });

  it("rendered terms also work with clause hashing", async () => {
    const tpl = CONTRACT_TEMPLATES.find((t) => t.id === "payment-promise")!;
    const { computeClauseHashes } = await import("../lib/contracts/commitHash");
    const terms = renderTemplate(tpl, {
      debtor: "Alice",
      creditor: "Bob",
      amount: "1000",
      currency: "GEN",
      dueDate: "April 15th",
    });
    const hashes = await computeClauseHashes(terms, "x".repeat(16));
    expect(hashes).toHaveLength(tpl.clauses.length);
  });

  it("every template renders under the contract's 4096-char limit when filled", () => {
    const fillers: Record<string, Record<string, string>> = {
      "service-delivery": {
        provider: "Acme Corp", client: "Globex Inc", scope: "Deliver 100 widgets",
        deliveryDate: "March 1st", amount: "50", currency: "GEN",
      },
      freelance: {
        freelancer: "Jane Doe", client: "Acme Corp", project: "Website redesign",
        dueDate: "June 30th", rate: "2000", currency: "GEN", revisions: "2",
      },
      "payment-promise": {
        debtor: "John Roe", creditor: "Acme Corp", amount: "1000",
        currency: "GEN", dueDate: "April 15th", lateFee: "5%",
      },
      "mutual-nda": {
        party: "Acme Corp", counterparty: "Globex Inc", term: "12 months",
        jurisdiction: "the laws of the State of Delaware",
      },
    };

    for (const tpl of CONTRACT_TEMPLATES) {
      const rendered = renderTemplate(tpl, fillers[tpl.id] ?? {});
      expect(rendered.length, tpl.id).toBeLessThanOrEqual(4096);
    }
  });
});