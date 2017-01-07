'use strict';

var config;

try {
    config = require('app-local/src/config')
} catch(err) {
    config = {};
}

config.projectConf = config.projectConf || function(d){};
config.projectPort = config.projectPort || function(d){ return 4000; };

config.VIZ_MODEL = 'redis';

module.exports = config;
