#!/usr/bin/env node
import program from 'commander';
import savePage from '..';

program
  .version('0.0.1')
  .arguments('pageURL')
  .description('Downloads the page and saves it locally.')
  .option('-o, --output [dir]', 'Output dir', process.cwd())
  .action(pageURL => savePage(pageURL, program.output))
  .parse(process.argv);
