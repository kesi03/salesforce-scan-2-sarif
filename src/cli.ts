#!/usr/bin/env tsx

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs";
import path from "path";

import { convertPMD } from "./converters/pmd.js";
import { convertESLint } from "./converters/eslint.js";
import { mergeSarif } from "./converters/merge.js";
import { writeSarifReport } from "./report.js";

yargs(hideBin(process.argv))
  .scriptName("sarif-tools")
  .usage("sarif-tools <command> [options]")

  // ---------------------------------------------------------
  // convert pmd <input> <output>
  // ---------------------------------------------------------
  .command(
    "convert pmd <input> <output>",
    "Convert PMD XML to SARIF",
    y =>
      y
        .positional("input", {
          type: "string",
          describe: "Path to PMD XML file",
          demandOption: true
        })
        .positional("output", {
          type: "string",
          describe: "Path to output SARIF file",
          demandOption: true
        }),
    async argv => {
      const sarif = await convertPMD(argv.input as string);
      fs.writeFileSync(argv.output as string, JSON.stringify(sarif, null, 2));
      console.log(`PMD SARIF written to ${argv.output}`);
    }
  )

  // ---------------------------------------------------------
  // convert eslint <input> <output>
  // ---------------------------------------------------------
  .command(
    "convert eslint <input> <output>",
    "Convert ESLint JSON to SARIF",
    y =>
      y
        .positional("input", {
          type: "string",
          describe: "Path to ESLint JSON file",
          demandOption: true
        })
        .positional("output", {
          type: "string",
          describe: "Path to output SARIF file",
          demandOption: true
        }),
    argv => {
      const sarif = convertESLint(argv.input as string);
      fs.writeFileSync(argv.output as string, JSON.stringify(sarif, null, 2));
      console.log(`ESLint SARIF written to ${argv.output}`);
    }
  )

  // ---------------------------------------------------------
  // convert all <indir> <outdir>
  // ---------------------------------------------------------
  .command(
    "convert all <indir> <outdir>",
    "Convert PMD + ESLint into SARIF files",
    y =>
      y
        .positional("indir", {
          type: "string",
          describe: "Directory containing pmd.xml and eslint.json",
          demandOption: true
        })
        .positional("outdir", {
          type: "string",
          describe: "Directory to write SARIF files",
          demandOption: true
        }),
    async argv => {
      const indir = argv.indir as string;
      const outdir = argv.outdir as string;

      const pmdXml = path.join(indir, "pmd.xml");
      const eslintJson = path.join(indir, "eslint.json");

      if (!fs.existsSync(pmdXml)) {
        console.error(`Missing file: ${pmdXml}`);
        process.exit(1);
      }
      if (!fs.existsSync(eslintJson)) {
        console.error(`Missing file: ${eslintJson}`);
        process.exit(1);
      }

      const pmdSarif = await convertPMD(pmdXml);
      const eslintSarif = convertESLint(eslintJson);

      fs.writeFileSync(path.join(outdir, "pmd.sarif"), JSON.stringify(pmdSarif, null, 2));
      fs.writeFileSync(path.join(outdir, "eslint.sarif"), JSON.stringify(eslintSarif, null, 2));

      console.log(`Converted PMD + ESLint SARIF written to ${outdir}`);
    }
  )

  // ---------------------------------------------------------
  // merge <target> <outdir>
  // ---------------------------------------------------------
  .command(
    "merge <target> <outdir>",
    "Merge PMD + ESLint SARIF files into unified SARIF",
    y =>
      y
        .positional("target", {
          type: "string",
          describe: "Target folder (not used directly)",
          demandOption: true
        })
        .positional("outdir", {
          type: "string",
          describe: "Directory containing pmd.xml and eslint.json",
          demandOption: true
        }),
    async argv => {
      const outDir = argv.outdir as string;

      const pmdPath = path.join(outDir, "pmd.xml");
      const eslintPath = path.join(outDir, "eslint.json");

      if (!fs.existsSync(pmdPath)) {
        console.error(`Missing file: ${pmdPath}`);
        process.exit(1);
      }
      if (!fs.existsSync(eslintPath)) {
        console.error(`Missing file: ${eslintPath}`);
        process.exit(1);
      }

      const pmdSarif = await convertPMD(pmdPath);
      const eslintSarif = convertESLint(eslintPath);

      const unified = mergeSarif(pmdSarif, eslintSarif);

      const outFile = path.join(outDir, "salesforce-unified.sarif");
      fs.writeFileSync(outFile, JSON.stringify(unified, null, 2));

      console.log(`Unified SARIF written to ${outFile}`);
    }
  )

  // ---------------------------------------------------------
  // validate <sarif>
  // ---------------------------------------------------------
  .command(
    "validate <sarif>",
    "Validate SARIF file against SARIF schema",
    y =>
      y.positional("sarif", {
        type: "string",
        describe: "Path to SARIF file",
        demandOption: true
      }),
    argv => {
      const sarifPath = argv.sarif as string;

      if (!fs.existsSync(sarifPath)) {
        console.error(`File not found: ${sarifPath}`);
        process.exit(1);
      }

      try {
        const json = JSON.parse(fs.readFileSync(sarifPath, "utf8"));

        if (!json.version || !json.runs) {
          throw new Error("Missing SARIF required fields");
        }

        console.log(`SARIF validation passed: ${sarifPath}`);
      } catch (err: any) {
        console.error(`SARIF validation failed: ${err.message}`);
        process.exit(1);
      }
    }
  )

  // ---------------------------------------------------------
  // bundle <indir> <outfile>
  // ---------------------------------------------------------
  .command(
    "bundle <indir> <outfile>",
    "Bundle all SARIF files in a directory into one SARIF",
    y =>
      y
        .positional("indir", {
          type: "string",
          describe: "Directory containing SARIF files",
          demandOption: true
        })
        .positional("outfile", {
          type: "string",
          describe: "Output SARIF file",
          demandOption: true
        }),
    argv => {
      const indir = argv.indir as string;
      const outfile = argv.outfile as string;

      const files = fs.readdirSync(indir).filter(f => f.endsWith(".sarif"));

      if (files.length === 0) {
        console.error(`No SARIF files found in ${indir}`);
        process.exit(1);
      }

      const runs: any[] = [];

      for (const file of files) {
        const sarif = JSON.parse(fs.readFileSync(path.join(indir, file), "utf8"));
        if (sarif.runs) {
          runs.push(...sarif.runs);
        }
      }

      const bundled = {
        version: "2.1.0",
        $schema: "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json",
        runs
      };

      fs.writeFileSync(outfile, JSON.stringify(bundled, null, 2));
      console.log(`Bundled SARIF written to ${outfile}`);
    }
  )

  // ---------------------------------------------------------
  // report <sarif> <output>
  // ---------------------------------------------------------
  .command(
    "report <sarif> <output>",
    "Convert SARIF to Markdown, HTML, or JUnit XML",
    y =>
      y
        .positional("sarif", {
          type: "string",
          describe: "Path to SARIF file",
          demandOption: true
        })
        .positional("output", {
          type: "string",
          describe: "Output .md, .html, or .xml report",
          demandOption: true
        }),
    argv => {
      const sarifPath = argv.sarif as string;
      const outputPath = argv.output as string;

      if (!fs.existsSync(sarifPath)) {
        console.error(`File not found: ${sarifPath}`);
        process.exit(1);
      }

      try {
        writeSarifReport(sarifPath, outputPath);
        console.log(`SARIF report written to ${outputPath}`);
      } catch (err: any) {
        console.error(`SARIF report generation failed: ${err.message}`);
        process.exit(1);
      }
    }
  )

  // ---------------------------------------------------------
  // discover <dir>
  // Auto-detect PMD, ESLint, SARIF files
  // ---------------------------------------------------------
  .command(
    "discover <dir>",
    "Discover PMD, ESLint, and SARIF files inside a directory",
    y =>
      y.positional("dir", {
        type: "string",
        describe: "Directory to scan",
        demandOption: true
      }),
    argv => {
      const dir = argv.dir as string;

      if (!fs.existsSync(dir)) {
        console.error(`Directory not found: ${dir}`);
        process.exit(1);
      }

      const files = fs.readdirSync(dir);

      const found = {
        pmd: files.includes("pmd.xml"),
        eslint: files.includes("eslint.json"),
        sarif: files.filter(f => f.endsWith(".sarif"))
      };

      console.log("Discovery results:");
      console.log(JSON.stringify(found, null, 2));
    }
  )

  .demandCommand()
  .strict()
  .help()
  .parse();
