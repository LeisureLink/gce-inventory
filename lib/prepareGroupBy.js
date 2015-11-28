'use strict';

let debug = require('debug')('gce-inventory:groupby');

let ptr = require('json-ptr');
let _ = require('lodash');

function addGroupItem(source, group, name) {
  if (!source[group]) {
    debug(`added group(${ group })`);
    source[group] = [];
  }
  source[group].push(name);
  debug(`added member(${ name }) to group(${ group })`);
}

function prepareGroupBy(ctx) {
  let groupers = [];

  _.forEach(ctx.doc.groups, (group) => {
    if (typeof(group) === 'string') {
      groupers.push((inventory, host) => {
        if (host[group]) {
          inventory[group] = inventory[group] || {};
          if (typeof(host[group]) === 'string') {
            addGroupItem(inventory[group], host[group], host.name);
          } else if (Array.isArray(host[group])) {
            host[group].forEach((it) => {
              addGroupItem(inventory[group], it, host.name);
            });
          }
        }
      });
    }
    if (typeof(group) === 'object') {
      if (group.prepend) {
        let name = Object.keys(group)[0]; // dependency on js-yaml's impl.
        let pointer = ptr.create(group.pointer || ptr.encodePointer([name]));
        groupers.push((inventory, host) => {
          inventory[name] = inventory[name] || {};
          let value = pointer.get(host);
          if (value) {
            value = Array.isArray(value) ? value : [value];
            value.forEach((it) => {
              addGroupItem(inventory[name], group.prepend + it, host.name);
            });
          }
        });
      }
    }
  });
  ctx.groupBy = groupers;

  return ctx;
}

module.exports = prepareGroupBy;
