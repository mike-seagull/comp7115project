var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 3000));

app.get('/', function(req, res) {
	res.send("Works");
});

app.listen(app.get('port'), function() {
	console.log("Running on port ", app.get('port'));
});