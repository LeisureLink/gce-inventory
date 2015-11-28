'use strict';

let debug = require('debug')('gce-inventory:list');

let gcloud = require('gcloud');
let util = require('util');
let path = require('path');
let promisify = require('es6-promisify');
let fs = require('fs');
let _ = require('lodash');

let promiseWriteFile = promisify(fs.writeFile);

let consts = require('./consts');
let loadOptions = require('./loadOptions');
let loadFileAsYaml = require('./loadFileAsYaml');
let prepareHostvarSelectors = require('./prepareHostvarSelectors');
let prepareGroupBy = require('./prepareGroupBy');
let fetchHostvarsAndAccumulateGroups = require('./fetchHostvarsAndAccumulateGroups');
let buildOrderedOutput = require('./buildOrderedOutput');

function writeOutputAsJson(output) {
  console.log(JSON.stringify(output));
}

function rewriteHostZoneMap(output) {
  let locations = {};
  _.forIn(output['_meta'].hostvars, (host, name) => {
    locations[name] = host.zone;
  });
  let homedir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  let fileName = path.join(homedir, consts.HOSTVAR_CACHE_FILENAME);
  return promiseWriteFile(fileName, JSON.stringify(locations, null, '  '), 'utf8');
}

function emitInventoryList() {
  return loadOptions()
    .then(loadFileAsYaml)
    .then(doc => {
      debug(`options: ${ util.inspect(doc, false, 9) }`);
      let cloud = gcloud(_.pick(doc, ['projectId', 'keyFileName']));
      let gce = cloud.compute();
      return fetchHostvarsAndAccumulateGroups(
          prepareHostvarSelectors(
            prepareGroupBy({
              doc, gce
            })))
        .then(buildOrderedOutput);
    })
    .then(output => {
      writeOutputAsJson(output);
      return output;
    })
    .then(rewriteHostZoneMap);
}

module.exports = emitInventoryList;
