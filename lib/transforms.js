'use strict';

let ptr = require('json-ptr');

const KEY_PTR = '/key';
const VALUE_PTR = '/value';

function lowercase(s) {
  return '' + s.toLowerCase();
}

function uppercase(s) {
  return '' + s.toUpperCase();
}

function objectfromkeyvalues(arr, key, value) {
  if (Array.isArray(arr)) {
    let keyPtr = ptr.create(key || KEY_PTR);
    let valuePtr = ptr.create(value || VALUE_PTR);
    return arr.reduce((acc, it) => {
      acc[keyPtr.get(it)] = valuePtr.get(it);
      return acc;
    }, {});
  }
}

module.exports = {
  lowercase, uppercase, objectfromkeyvalues
};
