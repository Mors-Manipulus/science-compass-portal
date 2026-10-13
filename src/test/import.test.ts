import { describe, expect, it } from "vitest";
import { autoMap, buildPreview, parseCSV, type DivisionLite } from "@/lib/import";

const divisions: DivisionLite[] = [
  { id: "d-ai", slug: "ai", name: "BlackSeaShark5 AI", short_name: "AI" },
  { id: "d-q", slug: "quantum", name: "BlackSeaShark5 Quantum", short_name: "Quantum" },
];

const csv = `id,title,authors,year,doi,division
1,"Paper, One",Ada Reyes; Kenji Watanabe,2024,10.1234/abc,AI
2,Existing Paper,X,2023,,
3,paper one,Y,2024,10.1234/ABC,Quantum
4,,Z,2024,,AI
5,Quantum Thing,Q,2025,,Physics`;

describe("publication import", () => {
  const rows = parseCSV(csv);
  const preview = buildPreview(rows, autoMap(Object.keys(rows[0])), [
    { id: "existing-1", title: "Existing paper", year: 2023, doi: null, source_id: null },
  ], divisions);

  it("parses quoted CSV cells containing commas", () => {
    expect(rows[0].title).toBe("Paper, One");
  });

  it("flags a record matching an existing publication by title and year as duplicate", () => {
    expect(preview[1].duplicateOf).toBe("existing-1");
    expect(preview[1].include).toBe(false);
  });

  it("flags a repeated DOI within the same file as duplicate", () => {
    expect(preview[2].duplicateOf).toBe("file:1");
  });

  it("rejects records without a title", () => {
    expect(preview[3].errors).toContain("Missing title");
    expect(preview[3].include).toBe(false);
  });

  it("leaves unrecognised divisions unassigned instead of guessing", () => {
    expect(preview[4].divisionIds).toEqual([]);
    expect(preview[0].divisionIds).toEqual(["d-ai"]);
  });
});
