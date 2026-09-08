import { Scanner } from "@salesforce/code-analyzer";
import path from "path";

export async function runScan(target: string, outDir: string) {
  const scanner = new Scanner();

  await scanner.run({
    target: [target],
    format: "xml",
    outfile: path.join(outDir, "pmd.xml")
  });

  await scanner.run({
    target: [target],
    format: "json",
    outfile: path.join(outDir, "eslint.json")
  });

  console.log(`Scan complete. PMD + ESLint written to ${outDir}`);
}
