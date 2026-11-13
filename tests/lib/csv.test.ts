import { describe, expect, it } from "vitest";
import { csvCell } from "@/lib/csv";

describe("csvCell", () => {
  it("neutralizes spreadsheet formula prefixes in text", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+1 555")).toBe("'+1 555");
    expect(csvCell("-cmd")).toBe("'-cmd");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("leaves numbers and ordinary text untouched", () => {
    expect(csvCell(-3)).toBe("-3");
    expect(csvCell(4)).toBe("4");
    expect(csvCell("Clear communication")).toBe("Clear communication");
    expect(csvCell(null)).toBe("");
  });

  it("quotes commas, quotes, and newlines", () => {
    expect(csvCell("a,b")).toBe("\"a,b\"");
    expect(csvCell("line\nbreak")).toBe("\"line\nbreak\"");
  });
});
