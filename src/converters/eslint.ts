import fs from "fs";

export function convertESLint(eslintJsonPath: string) {
  const data = JSON.parse(fs.readFileSync(eslintJsonPath, "utf8"));

  const rules: any[] = [];
  const ruleIndexMap: Record<string, number> = {};
  const results: any[] = [];
  const artifacts: any[] = [];

  data.forEach((fileResult: any) => {
    const filePath = fileResult.filePath;
    artifacts.push({ location: { uri: filePath } });

    fileResult.messages.forEach((msg: any) => {
      const ruleId = msg.ruleId || "eslint";
      const severity = msg.severity || 1;
      const level = severity === 2 ? "error" : "warning";

      if (!ruleIndexMap[ruleId]) {
        ruleIndexMap[ruleId] = rules.length;
        rules.push({
          id: ruleId,
          name: ruleId,
          shortDescription: { text: ruleId },
          fullDescription: { text: msg.message },
          properties: { category: "ESLint", severity }
        });
      }

      results.push({
        ruleId,
        ruleIndex: ruleIndexMap[ruleId],
        level,
        message: { text: msg.message },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: filePath },
              region: {
                startLine: msg.line || 1,
                startColumn: msg.column || 1
              }
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
            name: "Salesforce Code Analyzer - ESLint",
            rules
          }
        },
        artifacts,
        results
      }
    ]
  };
}
