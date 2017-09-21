'use strict';

let debug = require('debug')('gce-inventory:list');

let gcloud = require('@google-cloud/compute');
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

function writeOutputAsJson(inventory) {
  console.log(JSON.stringify(inventory));
}

function rewriteHostZoneMap(inventory) {
  let locations = {};
  _.forIn(inventory['_meta'].hostvars, (host, name) => {
    locations[name] = host.zone;
  });
  let homedir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  let fileName = path.join(homedir, consts.HOSTVAR_CACHE_FILENAME);
  return promiseWriteFile(fileName, JSON.stringify(locations, null, '  '), 'utf8');
}

function overlayGroupVars(inventory, groupVars) {
  if (groupVars) {
    _.forIn(groupVars, (value, key) => {
      debug(`overlay group_vars(${key}): ${ util.inspect(value, false, 9) }`);
      if (Array.isArray(inventory[key])) {
        inventory[key] = { hosts: inventory[key], vars: value };
      }
    });
  }
  return inventory;
}

function emitInventoryList() {
  return loadOptions()
    .then(loadFileAsYaml)
    .then(doc => {
      debug(`options: ${ util.inspect(doc, false, 9) }`);
      let gce = gcloud(_.pick(doc, ['projectId', 'keyFilename']));
      let ctx = {
        doc, gce,
        inventory: {
          hostvars: {},
          groups: {}
        }
      };
      prepareGroupBy(ctx);
      prepareHostvarSelectors(ctx);
      return fetchHostvarsAndAccumulateGroups(ctx)
        .then(buildOrderedOutput)
        .then(inventory => overlayGroupVars(inventory, doc.group_vars));
    })
    .then(inventory => {
      writeOutputAsJson(inventory);
      return inventory;
    })
    .then(rewriteHostZoneMap);
}

module.exports = emitInventoryList;
