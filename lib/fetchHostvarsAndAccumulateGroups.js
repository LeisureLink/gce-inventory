'use strict';

let debug = require('debug')('gce-inventory:fetch');

let ptr = require('json-ptr');
let util = require('util');
let _ = require('lodash');

let consts = require('./consts');

function fetchHostvarsAndAccumulateGroups(ctx) {
  let gce = ctx.gce;
  let zones = ctx.doc.zones || consts.ZONE_LIST;
  let inventory = ctx.inventory;
  let capture;
  let expect = 0;
  let externalIpPtr = ptr.create('/networkInterfaces/0/accessConfigs/0/natIP');
  let internalIpPtr = ptr.create('/networkInterfaces/0/networkIP');
  ctx.unordered = inventory;
  debug('started fetching host vars and accumulating groups');

  function onError(err) {
    if (capture) {
      capture.reject(err);
      capture = null;
    }
  }

  function onEnd() {
    if (expect === 0 && capture) {
      debug('done fetching host vars and accumulating groups');
      capture.resolve(ctx);
      capture = null;
    }
  }

  zones.forEach((zoneName) => {
    let zone = gce.zone(zoneName);
    expect++;
    zone.getVMs()
      .on('error', onError)
      .on('data', (vm) => {
        if (vm.metadata && vm.metadata.kind === 'compute#instance') {
          expect++;
          debug(`getting vm metadata(${ vm.name })`);
          vm.getMetadata((err, instance) => {
            expect--;
            if (err) {
              return onError(err);
            }
            debug(`recieved vm metadata: ${ util.inspect(instance, false, 9) }`);
            debug(`begin analyzing host: ${ instance.name }`);
            let hostvars = ctx.selectHostvars(instance, {
              zone: zoneName,
              name: instance.name
            });
            ctx.hostIpSelector(instance,
              hostvars, 'ansible_ssh_host', externalIpPtr, internalIpPtr);
            inventory.hostvars[instance.name] = hostvars;
            _.forEach(ctx.groupBy, fn => fn(inventory.groups, hostvars));
            debug(`end analyzing host: ${ instance.name }`);
            onEnd();
          });
        } else {
          debug(`vm skipped due to wrong metadata kind: ${vm.name}`);
        }
      })
      .on('end', () => {
        expect--;
        debug(`done getting vms zone (${ zoneName })`);
        onEnd();
      });
    debug(`started getting vms for zone(${ zoneName })`);
  });

  return new Promise((resolve, reject) => capture = {
    resolve, reject
  });
}

module.exports = fetchHostvarsAndAccumulateGroups;
