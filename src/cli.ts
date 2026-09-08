#!/usr/bin/env tsx

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runScan } from "./scanner/scan.js";
import { convertPMD } from "./converters/pmd.js";
import { convertESLint } from "./converters/eslint.js";
import { mergeSarif } from "./converters/merge.js";
import fs from "fs";
import path from "path";

yargs(hideBin(process.argv))
  .scriptName("sales-force-scan-2-sarif")
  .command(
    "scan <target> <outdir>",
    "Run Salesforce Code Analyzer and produce unified SARIF",
    y =>
      y
        .positional("target", { type: "string", demandOption: true })
        .positional("outdir", { type: "string", demandOption: true }),
    async argv => {
      const outDir = argv.outdir as string;

      await runScan(argv.target as string, outDir);

      const pmdSarif = await convertPMD(path.join(outDir, "pmd.xml"));
      const eslintSarif = convertESLint(path.join(outDir, "eslint.json"));

      const unified = mergeSarif(pmdSarif, eslintSarif);

      fs.writeFileSync(
        path.join(outDir, "salesforce-unified.sarif"),
        JSON.stringify(unified, null, 2)
      );

      console.log(`Unified SARIF written to ${outDir}/salesforce-unified.sarif`);
    }
  )
  .demandCommand()
  .strict()
  .help()
  .parse();
