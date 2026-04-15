import { readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(process.cwd(), "src");

async function findTestFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return findTestFiles(entryPath);
      }

      return entry.isFile() && (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.mts"))
        ? [entryPath]
        : [];
    }),
  );

  return nested.flat();
}

const testFiles = await findTestFiles(root);

if (testFiles.length === 0) {
  console.log("No test files found.");
  process.exit(0);
}

for (const testFile of testFiles) {
  await import(pathToFileURL(testFile).href);
}
