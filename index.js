#!/usr/bin/env node

'use strict';

let lib = require('foldero')('./lib', { relative: __dirname });
let pkg = require('./package');

let options = lib.parseOptions(process.argv);

switch (options.command) {
  case lib.consts.COMMAND_LIST:
    lib.emitInventoryList()
      .catch(err => lib.errorPrintUsage(err, pkg));
    break;
  case lib.consts.COMMAND_HOST:
    lib.emitHostvars(options.host)
      .catch(err => lib.errorPrintUsage(err, pkg));
    break;
  case lib.consts.COMMAND_HELP:
    lib.printUsage(pkg);
    break;
}
