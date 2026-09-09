# sarif-tools

A modern, lightweight CLI for converting Salesforce static analysis outputs into **SARIF**, merging multiple SARIF files, validating SARIF, bundling SARIF, and auto‑discovering PMD/ESLint/SARIF files inside a project.

This tool is designed for **CI/CD pipelines**, **GitHub Actions**, **Azure DevOps**, and **local development** where SARIF is required for security dashboards or automated code scanning.

It does **not** depend on Salesforce CLI, PMD, Java, or Salesforce Code Analyzer.  
You provide the raw output files (PMD XML, ESLint JSON, or SARIF), and this tool converts and merges them.

---

## 🚀 Features

- Convert **PMD XML → SARIF**
- Convert **ESLint JSON → SARIF**
- Convert **both automatically**
- Merge PMD + ESLint SARIF into a unified file
- Validate SARIF structure
- Bundle multiple SARIF files into one
- Discover PMD, ESLint, and SARIF files in a directory
- Zero Salesforce CLI dependencies
- Fully compatible with Node.js 20+
- Ideal for GitHub Actions and Azure DevOps

---

## 📦 Installation

Install globally:

```bash
pnpm add -g @mockholm/sarif-tools
```

Or use locally via `pnpm exec`:

```bash
pnpm exec sarif-tools <command>
```

---

## 🧭 CLI Commands

### 🔧 Convert PMD XML → SARIF

```bash
sarif-tools convert pmd pmd.xml pmd.sarif
```

### 🔧 Convert ESLint JSON → SARIF

```bash
sarif-tools convert eslint eslint.json eslint.sarif
```

### 🔧 Convert both automatically

```bash
sarif-tools convert all reports/ sarif/
```

This expects:

```
reports/pmd.xml
reports/eslint.json
```

Outputs:

```
sarif/pmd.sarif
sarif/eslint.sarif
```

---

### 🔀 Merge PMD + ESLint SARIF

```bash
sarif-tools merge force-app reports/
```

Produces:

```
reports/salesforce-unified.sarif
```

---

### 🔍 Discover PMD, ESLint, SARIF files

```bash
sarif-tools discover reports/
```

Example output:

```json
{
  "pmd": true,
  "eslint": true,
  "sarif": [
    "pmd.sarif",
    "eslint.sarif"
  ]
}
```

---

### 🧪 Validate SARIF

```bash
sarif-tools validate unified.sarif
```

Checks for:

- valid JSON
- required SARIF fields (`version`, `runs`)

---

### 📚 Bundle multiple SARIF files

```bash
sarif-tools bundle sarif/ all.sarif
```

Bundles all `.sarif` files in a directory into one unified SARIF.

---

### 📄 Generate Markdown or HTML reports

```bash
sarif-tools report unified.sarif unified.md
sarif-tools report unified.sarif unified.html
sarif-tools report unified.sarif unified.junit.xml
```

Creates a human-readable findings report from a SARIF file. The output format is
selected from the `.md`, `.html`, or `.xml` extension. JUnit XML output
represents each SARIF finding as a failed test case for CI test-reporting tools.

---

## 🏗 Directory Structure

Typical usage:

```
project/
  pmd.xml
  eslint.json
  sarif/
    pmd.sarif
    eslint.sarif
    unified.sarif
```

---

## 🔧 GitHub Actions Integration

Example workflow:

```yaml
- name: Convert PMD + ESLint to SARIF
  run: pnpm exec sarif-tools convert all reports/ sarif/

- name: Merge SARIF
  run: pnpm exec sarif-tools merge force-app sarif/
```

Upload SARIF:

```yaml
- name: Upload SARIF
  uses: actions/upload-artifact@v4
  with:
    name: unified-sarif
    path: sarif/salesforce-unified.sarif
```

---

## 🛠 Development

Install dependencies:

```bash
pnpm install
```

Run CLI locally:

```bash
pnpm exec sarif-tools <command>
```

---

## 📄 License

MIT License

---

## 🤝 Contributing

Pull requests are welcome.  
For major changes, please open an issue first to discuss what you would like to change.

---