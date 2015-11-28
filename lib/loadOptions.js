'use strict';

let debug = require('debug')('gce-inventory:load-options');

let fs = require('fs');
let promisify = require('es6-promisify');

let promiseCheckFileAccess = promisify(fs.access);

let consts = require('./consts');
let findFileInDirectoryOrRoot = require('./findFileInDirectoryOrRoot');

function loadOptions() {
  if (process.env.GCE_OPTIONS) {
    let file = process.env.GCE_OPTIONS;
    debug(`checking access to GCE_OPTIONS file from the environment: ${ file }`);
    return promiseCheckFileAccess(file, fs.R_OK)
      .then(() => {
        debug(`using GCE_OPTIONS file from the environment: ${ file }`);
        return file;
      });
  }

  let probePath = process.cwd();
  return findFileInDirectoryOrRoot(probePath, consts.GCE_OPTIONS_FILENAME);
}

module.exports = loadOptions;
