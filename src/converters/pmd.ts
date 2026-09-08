import fs from "fs";
import { parseStringPromise } from "xml2js";

export async function convertPMD(pmdXmlPath: string) {
  const xml = fs.readFileSync(pmdXmlPath, "utf8");
  const parsed = await parseStringPromise(xml);

  const files = parsed.pmd.file || [];
  const rules: any[] = [];
  const ruleIndexMap: Record<string, number> = {};
  const results: any[] = [];
  const artifacts: any[] = [];

  files.forEach((fileObj: any) => {
    const fileName = fileObj.$.name;
    artifacts.push({ location: { uri: fileName } });

    const violations = fileObj.violation || [];
    violations.forEach((v: any) => {
      const ruleId = v.$.rule;
      const priority = parseInt(v.$.priority || "3", 10);
      const beginLine = parseInt(v.$.beginline || "1", 10);
      const endLine = parseInt(v.$.endline || beginLine, 10);
      const message = (v._ || "").trim();
      const category = v.$.ruleset || "PMD";

      let level = "note";
      if (priority <= 2) level = "error";
      else if (priority === 3) level = "warning";

      if (!ruleIndexMap[ruleId]) {
        ruleIndexMap[ruleId] = rules.length;
        rules.push({
          id: ruleId,
          name: ruleId,
          shortDescription: { text: ruleId },
          fullDescription: { text: message },
          properties: { category, priority }
        });
      }

      results.push({
        ruleId,
        ruleIndex: ruleIndexMap[ruleId],
        level,
        message: { text: message },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: fileName },
              region: { startLine: beginLine, endLine }
            }
          }
        ]
      });
    });
  });

  return {
    version: "2.1.0",
    $schema: "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "Salesforce Code Analyzer - PMD",
            rules
          }
        },
        artifacts,
        results
      }
    ]
  };
}
