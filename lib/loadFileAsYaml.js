'use strict';

let fs = require('fs');
let promisify = require('es6-promisify');
let yaml = require('js-yaml');

let promiseReadFile = promisify(fs.readFile);

function loadFileAsYaml(file) {
  return promiseReadFile(file, 'utf8')
    .then(yaml.safeLoad);
}

module.exports = loadFileAsYaml;
