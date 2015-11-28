'use strict';

let commander = require('commander');
var _ = require('lodash');

let consts = require('./consts');

module.exports = function parseOptions(argv) {
  commander
    .option('-l, --list')
    .option('-H, --host <host>')
    .parse(argv);

  let options = _.pick(commander, [consts.COMMAND_LIST, consts.COMMAND_HOST]);

  if (options.list) {
    options.command = consts.COMMAND_LIST;
  } else if (options.host) {
    options.command = consts.COMMAND_HOST;
  } else {
    options.command = consts.COMMAND_HELP;
  }
  return options;
};
