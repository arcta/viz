'use strict';

/**********************************************************************
 * DEPENDENCIES *
 **********************************************************************/
const express = require('express'),
      http = require('http'),
      path = require('path'),
      app = express(),

      config = require('./local/config'),
      logger = require('./local/log'),
      port = config.projectPort('viz'),

      bodyParser = require('body-parser'),
      compress = require('compression'),
      statics = require('serve-static'),
      favicon = require('serve-favicon'),

      hbs = require('express-handlebars'),

      server = http.createServer(app),
      io = require('socket.io')(server);

config.projectConf('viz');
logger.log(__dirname, 'ALL');

app.use(favicon(path.join(__dirname, 'static/favicon.png')));
app.use(statics(path.join(__dirname, 'static')));
app.use(compress());

app.engine('.hbs', hbs({ extname: '.hbs' }));
app.set('view engine', '.hbs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

/**********************************************************************
 * MODELS *
 **********************************************************************/
const VIZ = require('./models/'+ (config.VIZ_MODEL || 'redis'));
VIZ.pubsub(io);

/**********************************************************************
 * ROUTES *
 **********************************************************************/
app.get('/', function(req, res, next) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/meta/:type', VIZ.meta);
app.get('/meta', VIZ.meta);

//app.get('/png/:id/:conf', VIZ.png);
//app.get('/png/:id', VIZ.png);

app.get('/d3/:id/:conf', VIZ.d3);
app.get('/d3/:id', VIZ.d3);

app.post('/', VIZ.put);

/**********************************************************************
 * EXCEPTIONS *
 **********************************************************************/
app.use(function(req, res, next){
    res.sendStatus(404);
});

app.use(function(err, req, res, next){
    res.sendStatus(err.status || 500);
});

/**********************************************************************
 * RUN *
 **********************************************************************/
server
    .listen(port, function(err,data) {
        logger.app.info('Started on PORT '+ port +' '+ new Date());
    });
