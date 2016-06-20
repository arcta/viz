/**********************************************************************
 * DEPENDENCIES *
 **********************************************************************/
var express = require('express'),
    http = require('http'),
    path = require('path'),
    app = express(),

    env = process.env,

    config = require(env.HOME +'/project/utilities/app/config'),
    logger = require(env.HOME +'/project/utilities/app/log'),

    crypto = require('crypto'),
    fs = require('fs'),

    errorHandler = require('errorhandler'),
    bodyParser = require('body-parser'),
    compress = require('compression'),
    static = require('serve-static'),
    favicon = require('serve-favicon'),

    hbs = require('express-handlebars'),

    project = __dirname.split('/')[4],
    port = config.projectPort(__dirname),

    server = http.createServer(app),
    io = require('socket.io')(server),
    redis = require('redis').createClient,
    pub = redis(config.NODE_REDIS_PORT, 'localhost', { auth_pass:config.NODE_REDIS_PASS }),
    sub = redis(config.NODE_REDIS_PORT, 'localhost', { auth_pass:config.NODE_REDIS_PASS });

logger.log(__dirname, 'ALL');

app.use(favicon(path.join(__dirname, 'static/favicon.png')));
app.use(static(path.join(__dirname, 'static')));
app.use(compress());

app.engine('.hbs', hbs({ extname: '.hbs' }));
app.set('view engine', '.hbs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/**********************************************************************
 * MODELS *
 **********************************************************************/
var VIZ = require('./viz');

/**********************************************************************
 * ROUTES *
 **********************************************************************/
app.get('/', function(req, res, next) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/meta/:type', VIZ.meta);
app.get('/meta', VIZ.meta);

app.get('/static/:id/:conf', VIZ.get);
app.get('/static/:id', VIZ.get);

app.get('/png/:id/:conf', VIZ.png);
app.get('/png/:id', VIZ.png);

app.get('/stream/:id', VIZ.stream);
app.get('/filter/:id', VIZ.filter);

app.get('/sample', VIZ.sample);

app.post('/static', VIZ.put);
app.post('/stream', VIZ.register);
app.post('/conf', VIZ.conf);


/**********************************************************************
 * EXCEPTIONS *
 **********************************************************************/
app.use(function(req, res, next){
    res.status(404);
    res.sendFile(__dirname +'/static/shared-assets/html/404.html');
});

app.use(function(err, req, res, next){
    res.status(err.status || 500);
    res.sendFile(__dirname +'/static/shared-assets/html/500.html');
});

/**********************************************************************
 * PUBSUB *
 **********************************************************************/
sub.on('subscribe', function(channel, count) {
    logger.app.info('SUB: '+ channel);
});

sub.on('error', function(err) {
    logger.app.error('SUB: '+ err);
});

sub.subscribe('sample-io');

io.sockets.on('connection', function(socket) {
    function follow(channel, message) {
        socket.emit(channel, message);
    }
    sub.on('message', follow);
    socket.on('disconnect', function(){
        sub.removeListener('message', follow);
    });
});

var timer;
function stream() {
    clearTimeout(timer);
    function callback(data) {
        pub.publish('sample-io', JSON.stringify(data[0]));
        timer = setTimeout(stream, 1000 + 5000*Math.random());
    }
    VIZ.sampleIO(callback);
}
timer = setTimeout(stream, 1000 + 5000*Math.random());

/**********************************************************************
 * RUN *
 **********************************************************************/
server
    .listen(port, function(err,data) {
        logger.app.info('Started SERVER for projects/'+ project
                            +'/app on PORT '+ port +' '+ new Date());
    });
