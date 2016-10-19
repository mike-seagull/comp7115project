var express = require('express');
var path = require('path');
var app = express();

// app variables
app.set('port', (process.env.PORT || 3000));
app.set('MYSQL_HOSTNAME', 'sp6xl8zoyvbumaa2.cbetxkdyhwsb.us-east-1.rds.amazonaws.com');
app.set('MYSQL_USERNAME', 'a0i3kvl4stvs4dvh');
app.set('MYSQL_PASSWORD', 'vyrzttz9k2q9na2r');

app.set('NEO4J_USERNAME', 'app57210483-jgyI3b');
app.set('NEO4J_PASSWORD', '7HpPCWui68YzQRMgfjuG');
app.set('NEO4J_URL', 'http://'+app.get('NEO4J_USERNAME')+':'+app.get('NEO4J_PASSWORD')+'@hobby-fplmbomjfhocgbkelakdbenl.dbs.graphenedb.com:24789');

// the app serves files from the public directory
app.use("/", express.static(path.join(__dirname, 'public')));

// bootstrap stuff
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap

// api routes
app.get('/api', function(req, res) {
	res.send("Works");
});
app.get('/', function(req, res){
	res.redirect('/login.html')
})

// start server
app.listen(app.get('port'), function() {
	console.log("Running on port", app.get('port'));
});

