'use strict';

let util = require('util');

function makeDebugString(value) {
  return (typeof(value) === 'object') ?
    util.inspect(value, false, 2) :
    value;
}

module.exports = makeDebugString;
