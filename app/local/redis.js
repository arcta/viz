'use strict';

var redis;

try {
    redis = require('app-local/src/redis');
} catch(err) {
    redis = require('redis').createClient;
}

exports.client = redis.client ||
    function(){ return redis(6379,'redis') };
