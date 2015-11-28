'use strict';

let debug = require('debug')('gce-inventory:load-options:find');

let assert = require('assert-plus');
let fs = require('fs');
let path = require('path');
let promisify = require('es6-promisify');

let promiseCheckFileAccess = promisify(fs.access);

function looksLikeFileSystemRelative(resource) {
  return typeof resource == 'string' &&
    resource.length > 1 && resource[0] === '.' ||
    (resource[1] === path.sep ||
      resource[1] === '.');
}

function joinPathNormalized(basePath, potentiallyRelative) {
  assert.string(basePath, 'basePath');
  assert.string(potentiallyRelative, 'potentiallyRelative');
  return looksLikeFileSystemRelative(potentiallyRelative) ?
    path.normalize(path.join(basePath, potentiallyRelative)) :
    path.join(basePath, potentiallyRelative);
}

function findFileInDirectoryOrRoot(dir, fileName) {
  let capture;

  function findFileProbe(dir, fileName) {
    let file = joinPathNormalized(dir, fileName);
    debug(`probing for existence of ${ file }`);
    promiseCheckFileAccess(file, fs.R_OK)
      .then(() => {
        debug(`using ${ fileName }: ${ file }`);
        capture.resolve(file);
      })
      .catch(err => {
        if (err.code === 'ENOENT') {
          let dirname = path.dirname(dir);
          if (dirname === dir) {
            debug(`directory probe did not find file: ${ fileName }`);
            capture.reject(new Error(`Could not find file in the current directory or parent directories: ${ fileName }.`));
          } else {
            return findFileProbe(dirname, fileName);
          }
        } else {
          debug(`Unexpected error while probing directories for ${ fileName }: ${ err.toString() }`);
          capture.reject(err);
        }
      });
  }

  findFileProbe(dir, fileName);

  return new Promise((resolve, reject) => capture = {
    resolve, reject
  });
}

module.exports = findFileInDirectoryOrRoot;
