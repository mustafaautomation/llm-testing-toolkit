import * as fs from 'fs';
import * as path from 'path';
import { TestRunResult } from '../core/suite';
import { logger } from '../utils/logger';

export class JsonReporter {
  private outputPath: string;

  constructor(outputPath?: string) {
    this.outputPath = outputPath || './llm-test-results/report.json';
  }

  report(result: TestRunResult): void {
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const json = JSON.stringify(result, null, 2);
    fs.writeFileSync(this.outputPath, json, 'utf-8');
    logger.info(`JSON report saved to ${this.outputPath}`);
  }
}
