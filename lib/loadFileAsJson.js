'use strict';

let fs = require('fs');
let promisify = require('es6-promisify');

let promiseReadFile = promisify(fs.readFile);

function loadFileAsJson(file) {
  return promiseReadFile(file, 'utf8')
    .then(JSON.parse);
}

module.exports = loadFileAsJson;
