const Koa = require('koa');
const IO = require('koa-socket');
const co = require('co');
var router = require('koa-router')();
var routers = require('./routers.js')(router);
var configs = require('./configs.js');
var koaPg = require('koa-pg');
var fun = require('./utils.js');
var models = require('./models');

var test = 'test';
const app =  new Koa();
const io = new IO();

io.attach(app);
/**
 * Socket middlewares
 * @type {string}
 */
app.context.clients = {} ;
io.use(co.wrap(function *(ctx,next) {
    const start = new Date;
    yield next();
    const ms = new Date - start;
    console.log( `WS ${ ms }ms` );
}));

io.on('connection',ctx=>{
    io.broadcast('connections',{
        num:io.connections.size
    })
});

io.on( 'disconnect', ctx => {
    io.broadcast( 'connections', {
        num: io.connections.size
    })
});

io.on( 'data', ( ctx, data ) => {
    ctx.socket.emit( 'response', {
        message: 'response from server'
    })
});
io.on( 'message', ( ctx, data ) => {

    app.context.clients[data] = ctx.socket;
    console.log(app.context.clients);
});
io.on( 'ack', ( ctx, data ) => {
    ctx.acknowledge( 'received' )
});
io.on( 'numConnections', packet => {
    console.log( `Number of connections: ${ io.connections.size }` )
});
io.on('leave', (ctx, data) => {
    console.log('leave');
    delete app.context.clients[data];
});

app.use(function*(next) {
  try {
    global.appDomain = 'http://localhost:8089';
    global.dashDomain = 'http://localhost:8088';

     // /var/www/yonghuid/xiangmuming
    // global.appDomain = 'http://api.gospely.com'
    // global.dashDomain = 'http://dash.gospely.com'
    yield next;
  } catch (err) {
    this.status = 200;
    this.body = {code: -1, message: '服务器忙请重试：' + err.message };
    console.log(err.message);
  }
});

// app.use(logger({
//   "filename": "./log_file.log"
// }));
// locale(app);

// app.use(i18n(app, {
//   directory: './locales',
//   locales: ['zh-cn', 'en-US'],
//   modes: [
//     'header',
//     function() {}
//   ]
// }))


// app.use(multer({ dest: './uploads/'}));

if (configs.isDBAvailable) {
  app.use(koaPg(configs.db.materDB));
}

// const options = {
//   headers: ['WWW-Authenticate', 'Server-Authorization', 'Content-Type',
//     'Authorization'
//   ],
//   credentials: true,
//   origin: '*'
// };
// app.use(cors(options));
//
// if (configs.isAuth) {
//   app.use(mount('/', auth.basicAuth));
// }
// app.use(mount('/container', container.filter));
// app
//   .use(router.routes())
//   .use(router.allowedMethods());

//上传文件模块
//文件监听
// watcher.buildListener('/var/www/storage/codes',[/(^|[\/\\])\../,'**/node_modules/**'], app);
app.on('error', function(err, ctx) {
  log.error('server error', err, ctx);
  this.body = fun.resp('500', err, ctx);
});
var setupDb;
if (configs.sync) {
  setupDb = db.sequelize.sync({
    force: true
  });
}

Promise.resolve(setupDb)
  .then(function() {
    app.listen(configs.port, function() {
      console.log(new Date() +
        ': gospel api is running, listening on port ' + configs.port);
    });
  });
