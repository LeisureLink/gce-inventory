'use strict';

let debug = require('debug')('gce-inventory:orderby');

let _ = require('lodash');

let makeDebugString = require('./makeDebugString');

function sortAndAddProperties(target, source) {
  Object.keys(source).sort()
    .forEach((k) => {
      debug(`sorting group members: ${ makeDebugString(k) }`);
      target[k] = Array.isArray(source[k]) ? source[k].sort() : source[k];
    });
}

function makeOrderFromGroups(groups) {
  if (Array.isArray(groups)) {
    return _.reduce(groups, (acc, it) => {
      acc.push((typeof(it) === 'object') ?
        Object.keys(it)[0] :
        it);
      return acc;
    }, []);
  }
}

function buildOrderedOutput(ctx) {
  let doc = ctx.doc;
  let unordered = ctx.unordered;
  let order = doc.order || makeOrderFromGroups(doc.groups) || ['hostvars'];
  let ordered = {};

  debug(`begin groupby`);
  if (order.indexOf('hostvars') < 0) {
    order.unshift('hostvars');
  }
  debug(`output order will be: ${ makeDebugString(order) }`);

  order.forEach((o) => {
    if (o === 'hostvars') {
      ordered['_meta'] = {
        hostvars: unordered.hostvars
      };
    } else {
      if (unordered.groups[o]) {
        sortAndAddProperties(ordered, unordered.groups[o]);
      }
    }
  });
  debug(`end groupby`);
  return ordered;
}

module.exports = buildOrderedOutput;
