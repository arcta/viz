'use strict';

/**********************************************************************
    this model uses REDIS to store contents while in development
 **********************************************************************/
const PROJECT = 'viz',
      fs = require('fs'),
      crypto = require('crypto'),

      config = require('../local/config'),
      logger = require('../local/log'),

      red = require('../local/redis').client(),
      sub = require('../local/redis').client(),

      Bundler = require('browserify'),
      CSS = require('clean-css'),
      Phantom = require('node-horseman');

config.projectConf('viz');
logger.log(__dirname, 'ALL');

const KEEP_CONTENT = config.KEEP_CONTENT || 60*60*24,
      KEEP_PNG = config.KEEP_PNG || 5000;

function setID(meta) {
    let text = meta.summary ? hash(meta.summary) : hash(meta),
        h = crypto.createHmac('md5','viz');
    h.update(text);
    meta.id = meta.flow +'-'+ meta.type +'-'+ h.digest('hex');
    return meta.id;
};

function hash(obj) {
/**********************************************************************
    make it more deterministic
 **********************************************************************/
    let str = '';
    Object.keys(obj).sort().map(function(k) {
        Object.keys(obj[k]).sort().map(function(s) {
            str += k+s+JSON.stringify(obj[k][s]);
        });
    });
    return str;
}

/**********************************************************************
 * EXPORTS *
 **********************************************************************/
exports.pubsub = function(io) {
    io.sockets.on('connection', function(socket) {
        function follow(channel, message) {
            socket.emit(channel, message);
        }
        sub.on('message', follow);
        socket.on('disconnect', function() {
            sub.removeListener('message', follow);
        });
    });
};


exports.meta = function(req, res, next) {
    let type = 'default';

    if ('undefined' !== typeof(req.params.type))
        type = req.params.type;

    fs.readFile('static/meta/'+ type +'.json', 'utf8', function(err, data) {
        if (err) {
            logger.app.error(err);
            res.sendStatus(500);
        }
        else res.json(JSON.parse(data));
    });
};


exports.put = function(req, res, next) {
    var data, meta, id, content, insights;

    try {
        meta = req.body.meta;
        insights = req.body.insights || {};
        data = req.body.data;
        id = meta.id || setID(meta);
    }
    catch (err) {
        logger.app.error(err);
    }

    meta.css = meta.css || [];
    meta.js = meta.js || [];

    if (meta.flow !== 'static')
        meta.js.push('transform');

    let bundler = Bundler(),
        socket = '<script src="/socket.io/socket.io.js"></script>',
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
            if (asset.substr(-4) === '/all') {
                let dir = asset.replace('/all','');
                fs.readdirSync('src/js/'+ dir).map(function(f) {
                    bundler.add('src/js/'+ dir +'/'+ f);
                });

            } else {
                bundler.add('src/js/'+ asset +'.js');
            }
        });

    if (!meta.dev)
        bundler.transform({ global: true }, 'uglifyify');

    bundler.bundle(function(err, buffer) {
        if (err) logger.app.error(err.message, err.line, err.col);

        jsBundle += buffer.toString();

        let out = {
            id: id,
            title: meta.title,
            description: meta.description,
            data: meta.flow === 'static' ? JSON.stringify(data) : '[]',
            meta: JSON.stringify(meta),
            insights: JSON.stringify(insights),
            stream: meta.flow === 'stream' ? socket : '',
            css: cssBundle,
            js: jsBundle,
            layout: meta.layout
        };

        if ('geo' in meta) {
            meta.geo.map(function(g) {
                let label = g.split('-').pop();
                out[label] = fs.readFileSync('static/data/'+ g +'.json','utf8').toString();
            });
        }

        res.render(meta.view, out, function(err, content) {
            if (err) return logger.app.error(err);
            red.set('viz-html/'+ id, content, function(err, status) {
                if (err) return logger.app.error(err);
                red.expire('viz-html/'+ id, KEEP_CONTENT);
                res.json({ id:id });
            });
        });
    });
};


exports.d3 = function(req, res, next) {
    red.get('viz-html/'+ req.params.id, function(err, content) {
        if (err) {
            logger.app.error(err);
            res.sendStatus(500);
        }
        else if (!content) {
            logger.app.error('missing content: '+ req.params.id);
            res.sendStatus(404);
        }
        else res.send(content);
    });
};


exports.png = function(req, res, next) {
    let id = req.params.id,
        conf = req.params.conf,
        port = config.projectPort('viz'),
        url = 'http://localhost:'+ port +'/d3/'+ id + (conf ? '/'+ conf:'') +'?image',
        file = 'static/phantom/'+ id + crypto.randomBytes(4).readUInt32LE(0) +'.png',
        dim = req.query.size || '1024x768',
        browser = new Phantom();

    dim = dim.split('x');

    browser
        .viewport(parseInt(dim[0],10), parseInt(dim[1],10))
        .open(url)
        .log()
        .waitForSelector('#done')
        .screenshot(file)
        .then(
            function() {
                fs.readFile(file, function(err, output) {
                    res.sendFile(__dirname.replace('/models','') +'/'+ file);
                    setTimeout(function() { fs.unlink(file); }, KEEP_PNG);
                });
            })
        .catch(
            function(err) {
                logger.app.error(err);
            })
        .close();
};

