export function mergeSarif(pmdSarif: any, eslintSarif: any) {
  return {
    version: "2.1.0",
    $schema: pmdSarif.$schema,
    runs: [...pmdSarif.runs, ...eslintSarif.runs]
  };
}
