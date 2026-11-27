import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// D19: local Node (.nvmrc) and Vercel (package.json engines) must agree on the major version.
describe("Node version", () => {
  it("is the same major in .nvmrc and package.json engines", () => {
    const nvmrc = readFileSync(".nvmrc", "utf8").trim();
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      engines: { node: string };
    };

    expect(nvmrc).toMatch(/^\d+$/);
    expect(pkg.engines.node).toBe(`>=${nvmrc} <${Number(nvmrc) + 1}`);
  });
});
