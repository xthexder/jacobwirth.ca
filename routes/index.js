exports.setupRoutes = function(app) {
  app.get('/', function(req, res) {
    res.render('index');
  });

  app.get('/resume', function(req, res) {
    res.render('resume');
  });
};
