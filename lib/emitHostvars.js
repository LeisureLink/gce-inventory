'use strict';

let debug = require('debug')('gce-inventory:host');

let gcloud = require('@google-cloud/compute');
let util = require('util');
let path = require('path');
let ptr = require('json-ptr');
let _ = require('lodash');

let consts = require('./consts');
let loadOptions = require('./loadOptions');
let loadFileAsJson = require('./loadFileAsJson');
let loadFileAsYaml = require('./loadFileAsYaml');
let prepareHostvarSelectors = require('./prepareHostvarSelectors');
let prepareGroupBy = require('./prepareGroupBy');

function writeOutputAsJson(output) {
  console.log(JSON.stringify(output));
}

function loadHostZoneMap() {
  let homedir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  let fileName = path.join(homedir, consts.HOSTVAR_CACHE_FILENAME);
  return loadFileAsJson(fileName);
}

function emitHostvars(host) {
  return loadOptions()
    .then(loadFileAsYaml)
    .then(doc => {
      debug(`options: ${ util.inspect(doc, false, 9) }`);
      let gce = gcloud(_.pick(doc, ['projectId', 'keyFilename']));
      let externalIpPtr = ptr.create('/networkInterfaces/0/accessConfigs/0/natIP');
      let internalIpPtr = ptr.create('/networkInterfaces/0/networkIP');
      let ctx = prepareHostvarSelectors(prepareGroupBy({
        gce, doc
      }));

      return loadHostZoneMap()
        .then(locations => {
          let zoneName = locations[host];
          let zone = gce.zone(zoneName);
          let vm = zone.vm(host);
          debug(`getting vm metadata(${ vm.name })`);
          return new Promise((resolve, reject) => {
            vm.getMetadata((err, instance) => {
              if (err) {
                return reject(err);
              }
              debug(`recieved vm metadata: ${ util.inspect(instance, false, 9) }`);
              debug(`begin analyzing host: ${ instance.name }`);
              let hostvars = ctx.selectHostvars(instance, {
                zone: zoneName,
                name: instance.name
              });
              ctx.hostIpSelector(instance,
                hostvars, 'ansible_ssh_host', externalIpPtr, internalIpPtr);
              debug(`end analyzing host: ${ instance.name }`);
              resolve(hostvars);
            });
          });
        })
        .then(output => {
          writeOutputAsJson(output);
          return output;
        });
    });
}

module.exports = emitHostvars;
