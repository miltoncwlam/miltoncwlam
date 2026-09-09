import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { detailedScanPdf, detailedTextPdf } from "./study-pdf";
import { TEST_FIXTURE_FILES } from "./test-sources";

async function main() {
  const dir = join(process.cwd(), "tests/fixtures");
  writeFileSync(join(dir, TEST_FIXTURE_FILES.detailedPdf), detailedTextPdf());
  writeFileSync(join(dir, TEST_FIXTURE_FILES.scanPdf), await detailedScanPdf());
  console.log("wrote", TEST_FIXTURE_FILES.detailedPdf, TEST_FIXTURE_FILES.scanPdf);
}

void main();
