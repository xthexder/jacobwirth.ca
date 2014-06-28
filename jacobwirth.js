var fs = require('fs'),
  express = require('express'),
  http = require('http');

var app = express();
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');

  app.use(express.favicon());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);

  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
  app.use(express.logger('dev'));
  app.use(express.errorHandler());
});

require('./routes.js')(app);

var socket = '/tmp/jacobwirth-node.socket';
if (fs.existsSync(socket)) fs.unlinkSync(socket);

http.createServer(app).listen(process.env.PORT || socket, function() {
  if (!process.env.PORT) fs.chmod(socket, '666');

  console.log("jacobwirth.ca server listening on " + (process.env.PORT ? "port " + process.env.PORT : socket));
});
