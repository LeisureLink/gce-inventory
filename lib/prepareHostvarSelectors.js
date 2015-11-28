'use strict';

let debug = require('debug')('gce-inventory:hostvars');

let assert = require('assert-plus');
let ptr = require('json-ptr');

let consts = require('./consts');
let makeDebugString = require('./makeDebugString');
let transforms = require('./transforms');

function getAssertNamedTransform(name) {
  assert.string(name, 'name');
  let lowerName = name.toLowerCase();
  if (typeof(transforms[lowerName]) !== 'function') {
    throw new Error(`ERROR - transform not found: ${ name }.`);
  }
  return transforms[lowerName];
}

function prepareHostvarSelectors(ctx) {
  let ipPtr = ptr.create(ctx.doc.ansible_ssh_host || consts.DEFAULT_HOST_IP);
  ctx.hostIpSelector = (source, target, name, internalIpPtr, externalIpPtr) => {
    let ip = ipPtr.get(target);
    if (ip) {
      target[name] = ip;
      debug(`using hostvars(${ ipPtr }): ${ makeDebugString(ip) } as ${ name }`);
    } else if (ip = externalIpPtr.get(source)) {
      target[name] = ip;
      debug(`using instance(${ externalIpPtr }): ${ makeDebugString(ip) } as ${ name }`);
    } else if (ip = internalIpPtr.get(source)) {
      target[name] = ip;
      debug(`using instance(${ internalIpPtr }): ${ makeDebugString(ip) } as ${ name }`);
    }
  };
  let hostvars = ctx.doc.hostvars || [];
  let selectors = hostvars.map(item => {
    if (typeof(item) === 'string') {
      debug(`hostvar(${item}) is a simple property reference`);
      return {
        name: item,
        select: (source, target, name) => {
          let raw = source[name];
          debug(`extracted source(${ name }): ${ makeDebugString(raw) }`);
          target[name] = raw;
          debug(`assigned hostvar(${ name }): ${ makeDebugString(raw) }`);
        }
      };
    }
    if (typeof(item) === 'object') {
      let name = Object.keys(item)[0];
      let pointer = ptr.create(item.pointer ||
        ((typeof(item[name]) === 'string') ? item[name] : undefined) ||
        ptr.encodePointer([name]));
      if (item.transform) {
        debug(`hostvar(${name}) selects ${pointer} and uses transform(${item.transform})`);
        let tx = getAssertNamedTransform(item.transform);
        return {
          name,
          select: (source, target, name) => {
            let raw = pointer.get(source);
            debug(`extracted source(${ pointer }): ${ makeDebugString(raw) }`);
            let transformed = tx(raw);
            target[name] = transformed;
            debug(`assigned hostvar(${ name }): ${ makeDebugString(transformed) }`);
          }
        };
      }
      if (item.captureRe) {
        debug(`hostvar(${name}) selects ${pointer} and uses captureRe(${item.captureRe})`);
        return {
          name,
          select: (source, target, name) => {
            let re = new RegExp(item.captureRe);
            let raw = pointer.get(source);
            debug(`extracted source(${ pointer }): ${ makeDebugString(raw) }`);
            let match = re.exec(raw);
            if (match) {
              target[name] = match[0];
              debug(`assigned hostvar(${ name }): ${ makeDebugString(match[0]) }`);
            }
          }
        };
      }
      debug(`hostvar(${name}) selects ${pointer}`);
      return {
        name,
        select: (source, target, name) => {
          let raw = pointer.get(source);
          debug(`extracted source(${ pointer }): ${ makeDebugString(raw) }`);
          target[name] = raw;
          debug(`assigned hostvar(${ name }): ${ makeDebugString(raw) }`);
        }
      };
    }
  }, []);
  ctx.selectHostvars = (instance, init) => {
    return selectors.reduce((acc, item) => {
      item.select(instance, acc, item.name);
      return acc;
    }, init || {});
  };
  return ctx;
}

module.exports = prepareHostvarSelectors;
