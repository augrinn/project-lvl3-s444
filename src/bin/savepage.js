#!/usr/bin/env node
import program from 'commander';
import savePage from '..';

program
  .version('0.0.8')
  .arguments('pageURL')
  .description('Downloads the page and saves it locally.')
  .option('-o, --output [dir]', 'Output dir', process.cwd())
  .action((pageURL) => {
    savePage(pageURL, program.output)
      .then(() => console.log(`Page ${pageURL} was saved to directory ${program.output}`))
      .catch((e) => {
        console.error(`FAIL: ${e.message}`);
        process.exit(1);
      });
  })
  .parse(process.argv);
