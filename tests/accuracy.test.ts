import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { measureAccuracy } from "../src/lib/accuracy";
import { csvCell, toCsv } from "../src/lib/csv";

const base = {
  is_funding_round: true, company: "Acme", amount_value: 100, currency: "USD" as const, amount_raw: "$100",
  stage: "Seed" as const, investors: [], sector: null, city: "Pune", announced_date: "2026-01-01",
  use_of_funds: null, founder_name: null,
};

describe("accuracy", () => {
  it("scores agreement per field", () => {
    const r = measureAccuracy([
      { raw_extraction: base, company: "ACME", amount_value: 100, stage: "Seed", city: "Pune", announced_date: "2026-01-01" },
      { raw_extraction: base, company: "Acme", amount_value: 200, stage: "Seed", city: "Pune", announced_date: "2026-01-01" },
      { raw_extraction: null, company: "x", amount_value: 1, stage: null, city: null, announced_date: null },
    ]);
    assert.equal(r.n, 2);
    assert.equal(r.perField.amount_value, 0.5);
    assert.equal(r.perField.company, 1);
    assert.equal(r.allCorrect, 0.5);
  });
  it("reports null with no data", () => {
    assert.equal(measureAccuracy([]).allCorrect, null);
  });
});

describe("csv", () => {
  it("neutralises formulas and quotes", () => {
    assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
    assert.equal(csvCell('a,"b"'), '"a,""b"""');
    assert.equal(toCsv(["h"], [["x"]]), "h\r\nx\r\n");
  });
});

describe("schema tolerance", () => {
  it("joins a founder list into one string", async () => {
    const { ExtractionSchema } = await import("../src/lib/schema");
    const out = ExtractionSchema.parse({ ...base, founder_name: ["A", "B"] });
    assert.equal(out.founder_name, "A, B");
  });
});

describe("founder helper", () => {
  it("takes the first named founder", async () => {
    const { firstFounder } = await import("../src/lib/signals");
    assert.equal(firstFounder("Anish Priyadarshi and Sanjeev Kumar"), "Anish Priyadarshi");
    assert.equal(firstFounder("A B, C D"), "A B");
    assert.equal(firstFounder(null), null);
  });
});
