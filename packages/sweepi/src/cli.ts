#!/usr/bin/env node

import { initializeToolchain, runSweepi } from './toolchain';

async function run(): Promise<void> {
  const command = process.argv[2];

  if (command === undefined || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'init') {
    const initialization = await initializeToolchain();

    if (initialization.installedDependencies) {
      process.stdout.write(
        `Initialized Sweepi toolchain in ${initialization.toolchainDirectory}\n`,
      );
      return;
    }

    process.stdout.write(
      `Sweepi toolchain already initialized in ${initialization.toolchainDirectory}\n`,
    );
    return;
  }

  if (command.startsWith('-')) {
    throw new Error(`Unknown flag "${command}". Try "sweepi --help".`);
  }

  const lintExitCode = await runSweepi(command);
  process.exitCode = lintExitCode;
}

function printHelp(): void {
  process.stdout.write(`Usage:
  sweepi <project-dir>
  sweepi init

Commands:
  <project-dir>    Initialize if required, then run eslint using ~/.sweepi
  init    Create ~/.sweepi and install rules
`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
