'use strict';

let colors = require('colors/safe');
let printUsage = require('./printUsage');

function errorPrintUsage(err, pkg) {
  console.error(colors.red(err.stack));
  printUsage(pkg);
  process.exit(1);
}

module.exports = errorPrintUsage;
