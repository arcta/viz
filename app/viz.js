'use strict';

var fs = require('fs'),
    crypto = require('crypto'),
    env = process.env,
    config = require(env.HOME +'/project/utilities/app/config'),
    logger = require(env.HOME +'/project/utilities/app/log'),
    redis = require(env.HOME +'/project/utilities/app/redis').client(config),

    Bundler = require('browserify'),
    CSS = require('clean-css'),
    Phantom = require('node-horseman'),
    shell = require('python-shell');

logger.log(__dirname, 'ALL');

function setID(text) {
    var h = crypto.createHmac('md5','viz');
    h.update(text);
    return h.digest('hex');
};

function hash(obj) {
/**********************************************************************
    deterministic
 **********************************************************************/
    var str = '';
    Object.keys(obj).sort().map(function(k) {
        Object.keys(obj[k]).sort().map(function(s) {
            str += k+s+JSON.stringify(obj[k][s]);
        });
    });
    return str;
}

function metakey(res, meta) {
    var key = meta.source +
        JSON.stringify({ type:meta.type, x:meta.x, y:meta.y, z:meta.z }),
        id = setID(key);

    redis.set('viz-meta/'+ id, JSON.stringify(meta), function(err, status) {
        res.json({ status:status, error:err, id:id });
        redis.expire('viz-meta/'+ id, 60*60*24*365);
    });
}

function output(res, id, meta, conf, data) {
    data = data || '[]';
    meta.css = meta.css || [];
    meta.js = meta.js || [];

    var bundler = Bundler(),
        socket = meta.stream ? '<script src="/socket.io/socket.io.js"></script>':'',
        cssBundleObj = new CSS().minify(
            meta.css
                .map(
                    function(asset) {
                        return 'src/css/'+ asset +'.css';
                    })),
        cssBundle = cssBundleObj.styles || '',
        jsBundle = '';

    meta.js
        .map(function(asset) {
            bundler.add('src/js/'+ asset +'.js');
        });

    //bundler.transform({ global: true }, 'uglifyify');

    bundler.bundle(function(err, buffer) {
        jsBundle += buffer.toString();

        var out = {
            id: id,
            bookmark: Object.keys(conf).length > 0,
            data: data,
            meta: JSON.stringify(meta),
            conf: JSON.stringify(conf),
            stream: socket,
            css: cssBundle,
            js: jsBundle,
            layout: meta.layout
        };

        if ('geo' in meta) {
            meta.geo.map(function(g) {
                var label = g.split('-').pop();
                output[label] = fs.readFileSync('static/data/'+ g +'.json','utf8').toString();
            });
        }
        res.render(meta.view, out);
    });
}

function getViz(res, id, conf) {
    conf = conf || {};

    redis.get('viz-meta/'+ id, function(err, meta) {
        if (err) return logger.app.error(err);
        if (!meta) return logger.app.error('getViz: missing meta for '+ id);

        meta = JSON.parse(meta);
        if (!meta.source)
            res.json({ error:'Missing data source key!' });

        redis.get('viz-data/'+ meta.source, function(err, data) {
            output(res, id, meta, conf, data);
        });
    });
}

function streamViz(res, id, conf) {
    conf = conf || {};

    redis.get('viz-meta/'+ id, function(err, meta) {
        if (err) return logger.app.error(err);
        if (!meta) return logger.app.error('streamViz: missing meta for '+ id);

        meta = JSON.parse(meta);
        if (!meta.source)
            res.json({ error:'Missing data source key!' });

        output(res, id, meta, conf);
    });
}

function getSample(callback) {
    var options = {
            mode: 'json',
            scriptPath: env.HOME +'/'+ config.NODE_DOC_ROOT +'/viz/nbclient/',
            args: []
        };

    shell.run('sample.py', options, function (err, results) {
        if (err) return logger.app.error('Python-Shell: '+ err);
        callback(results[0]);
    });
}

/**********************************************************************
 * EXPORTS *
 **********************************************************************/

exports.meta = function(req, res, next) {
    var type = 'default';

    if ('undefined' !== typeof(req.params.type))
        type = req.params.type;

    fs.readFile('static/meta/'+ type +'.json', 'utf8', function(err, data) {
        if (err) return logger.app.error(err);
        res.json(JSON.parse(data));
    });
};


exports.put = function(req, res, next) {
    var data = JSON.stringify(req.body.data),
        meta = req.body.meta,
        id = setID(hash(req.body.meta.summary));

    redis.set('viz-data/'+ id, data, function(err, status) {
        if (err) return logger.app.error(err);

        if (meta.dynamic || meta.stream)
            redis.expire('viz-data/'+ id, 60);
        else
            redis.expire('viz-data/'+ id, 60*60*24*365);

        meta.source = id;
        meta.static = true;

        delete(meta.dynamic)
        delete(meta.refresh)

        delete(meta.stream)
        delete(meta.window)

        metakey(res, req.body.meta);
    });
};


exports.register = function(req, res, next) {
    metakey(res, req.body.meta);
};


exports.conf = function(req, res, next) {
    var conf = JSON.stringify(req.body.conf),
        key = req.body.key;

    redis.set('viz-conf/'+ key, conf, function(err, status) {
        res.json({ key:key, status:status, error:err });
        redis.expire('viz-conf/'+ key, 60*60*24*150);
    });
};


exports.get = function(req, res, next) {
    if ('undefined' !== typeof(req.params.conf))
        redis.get('viz-conf/'+ req.params.conf, function(err, data) {
            if (err) return logger.app.error(err);
            if (!data) return logger.app.error('redis get: missing '+ req.params.conf);

            var conf = JSON.parse(data);
            getViz(res, req.params.id, conf);
        });

    else getViz(res, req.params.id);
};


exports.stream = function(req, res, next) {
    if ('undefined' !== typeof(req.params.conf))
        redis.get('viz-conf/'+ req.params.conf, function(err, data) {
            if (err) return logger.app.error(err);
            if (!data) return logger.app.error('redis get: missing '+ req.params.conf);

            var conf = JSON.parse(data);
            streamViz(res, req.params.id, conf);
        });

    else streamViz(res, req.params.id);
};


exports.png = function(req, res, next) {
    var id = req.params.id,
        conf = req.params.conf,
        port = config.projectPort(__dirname),
        url = 'http://'+ config.NODEIP +':'+ port +'/static/'+ id + (conf ? '/'+ conf:'') +'?image',
        file = 'static/phantom/'+ id + crypto.randomBytes(4).readUInt32LE(0) +'.png',
        dim = req.query.size || '1024x768',
        browser = new Phantom();

    dim = dim.split('x');

    browser
        .viewport(parseInt(dim[0],10), parseInt(dim[1],10))
        .open(url)
        .waitForSelector('#done')
        .screenshot(file)
        .then(
            function() {
                fs.readFile(file, function(err, output) {
                    res.sendFile(__dirname +'/'+ file);
                    setTimeout(function() { fs.unlink(file); }, 5000);
                });
            })
        .catch(
            function (err) {
                logger.app.error(err);
            })
        .close();
};


exports.filter = function(req, res, next) {
    var options = {
            mode: 'json',
            scriptPath: env.HOME +'/'+ config.NODE_DOC_ROOT +'/viz/nbclient/',
            args: [req.params.id]
        };

    shell.run('stream.py', options, function (err, results) {
        if (err) return logger.app.error(err);
        res.json(results[0]);
    });
};


exports.sample = function(req, res, next) {
    getSample(function(data){ res.json(data); });
};


exports.sampleIO = function(callback) {
    getSample(callback);
};

