import fs from "fs";
import path from "path";

type SarifResult = {
  ruleId?: string;
  level?: string;
  message?: { text?: string };
  locations?: Array<{
    physicalLocation?: {
      artifactLocation?: { uri?: string };
      region?: { startLine?: number };
    };
  }>;
};

type SarifRun = {
  tool?: { driver?: { name?: string } };
  results?: SarifResult[];
};

type SarifDocument = {
  runs?: SarifRun[];
};

function escapeMarkdown(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("\n", " ");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
    .replaceAll("\n", " ");
}

function resultLocation(result: SarifResult): string {
  const location = result.locations?.[0]?.physicalLocation;
  const uri = location?.artifactLocation?.uri || "unknown";
  const line = location?.region?.startLine;
  return line ? `${uri}:${line}` : uri;
}

function resultRows(document: SarifDocument): Array<{
  tool: string;
  rule: string;
  level: string;
  message: string;
  location: string;
}> {
  return (document.runs || []).flatMap(run => {
    const tool = run.tool?.driver?.name || "Unknown tool";
    return (run.results || []).map(result => ({
      tool,
      rule: result.ruleId || "unknown",
      level: result.level || "warning",
      message: result.message?.text || "No message",
      location: resultLocation(result)
    }));
  });
}

function toMarkdown(rows: ReturnType<typeof resultRows>): string {
  const lines = [
    "# SARIF Report",
    "",
    `Total findings: **${rows.length}**`,
    "",
    "| Tool | Rule | Level | Location | Message |",
    "| --- | --- | --- | --- | --- |"
  ];

  for (const row of rows) {
    lines.push(
      `| ${escapeMarkdown(row.tool)} | ${escapeMarkdown(row.rule)} | ${escapeMarkdown(row.level)} | ${escapeMarkdown(row.location)} | ${escapeMarkdown(row.message)} |`
    );
  }

  return `${lines.join("\n")}\n`;
}

function toHtml(rows: ReturnType<typeof resultRows>): string {
  const tableRows = rows
    .map(
      row =>
        `        <tr><td>${escapeHtml(row.tool)}</td><td>${escapeHtml(row.rule)}</td><td>${escapeHtml(row.level)}</td><td>${escapeHtml(row.location)}</td><td>${escapeHtml(row.message)}</td></tr>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SARIF Report</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d0d7de; padding: 0.5rem; text-align: left; vertical-align: top; }
    th { background: #f6f8fa; }
    code { white-space: nowrap; }
  </style>
</head>
<body>
  <h1>SARIF Report</h1>
  <p>Total findings: <strong>${rows.length}</strong></p>
  <table>
    <thead><tr><th>Tool</th><th>Rule</th><th>Level</th><th>Location</th><th>Message</th></tr></thead>
    <tbody>
${tableRows}
    </tbody>
  </table>
</body>
</html>
`;
}

function toJUnit(rows: ReturnType<typeof resultRows>): string {
  const testCases = rows
    .map(
      row => `    <testcase classname="${escapeXml(row.tool)}" name="${escapeXml(`${row.rule} - ${row.location}`)}">
      <failure message="${escapeXml(row.message)}" type="${escapeXml(row.level)}">${escapeXml(`${row.location}: ${row.message}`)}</failure>
    </testcase>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="SARIF Report" tests="${rows.length}" failures="${rows.length}" errors="0" skipped="0">
  <testsuite name="SARIF findings" tests="${rows.length}" failures="${rows.length}" errors="0" skipped="0">
${testCases}
  </testsuite>
</testsuites>
`;
}

export function writeSarifReport(inputFile: string, outputFile: string): void {
  const document = JSON.parse(fs.readFileSync(inputFile, "utf8")) as SarifDocument;
  const rows = resultRows(document);
  const extension = path.extname(outputFile).toLowerCase();

  const isJUnit = extension === ".xml" || outputFile.toLowerCase().endsWith(".junit.xml");
  if (extension !== ".md" && extension !== ".html" && !isJUnit) {
    throw new Error("Report output must use a .md, .html, or .xml extension");
  }

  const content = extension === ".md" ? toMarkdown(rows) : extension === ".html" ? toHtml(rows) : toJUnit(rows);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, content);
}
