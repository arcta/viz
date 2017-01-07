'use strict';

var intel = require('intel'),
    logger = {};

/**********************************************************************
    intel.TRACE // intel.trace()
    intel.VERBOSE // intel.verbose()
    intel.DEBUG // intel.debug()
    intel.INFO // intel.info()
    intel.WARN // intel.warn()
    intel.ERROR // intel.error()
    intel.CRITICAL // intel.critical()

    intel.NONE
    intel.ALL
 **********************************************************************/

logger.log = function(dir, level) {
    var name, m = dir.match(/projects\/([\-\w]+)\/app/);
    if (!m || m.length < 2) name = 'app';
    else name = m[1];
    logger.app = intel.getLogger(name);
    logger.app
        .setLevel(intel[level])
        .addHandler(new intel.handlers.File(process.env.HOME +'/logs/'+ name +'.log'));
    logger.app.info('Started logging level '+ level +' '+ new Date());
};

module.exports = logger;
