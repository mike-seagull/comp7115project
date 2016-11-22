var express = require('express');
var path = require('path');
var app = express();
var bodyParser = require('body-parser');
var mysql      = require('mysql');
var neo4j = require('neo4j-driver').v1;

// app variables
app.set('port', (process.env.PORT || 3000));
app.set('MYSQL_HOSTNAME', 'sp6xl8zoyvbumaa2.cbetxkdyhwsb.us-east-1.rds.amazonaws.com');
app.set('MYSQL_USERNAME', 'a0i3kvl4stvs4dvh');
app.set('MYSQL_PASSWORD', 'vyrzttz9k2q9na2r');
app.set('MYSQL_SCHEMA', 'b6spocrisll4z0jk');

app.set('NEO4J_USERNAME', 'app57210483-jgyI3b');
app.set('NEO4J_PASSWORD', '7HpPCWui68YzQRMgfjuG');
app.set('NEO4J_URL', 'http://'+app.get('NEO4J_USERNAME')+':'+app.get('NEO4J_PASSWORD')+'@hobby-fplmbomjfhocgbkelakdbenl.dbs.graphenedb.com:24789');

// the app serves files from the public directory
app.use("/", express.static(path.join(__dirname, 'public')));

// body parsers; need these for parsing url-encoded data from post requests
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// bootstrap stuff
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap

var driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', 'ruchinarayan'));
var session = driver.session();

//sample cypher query for neo4j
session
  .run( "CREATE (a:User {user_id:1, first_name:'Ruchi', last_name: 'Yadav', email: 'ruchi@memphis.edu', password: 'ruchi'})" )
  .then( function()
  {
    return session.run( "MATCH (a:User) WHERE a.first_name = 'Ruchi' RETURN a.first_name AS first, a.last_name AS last" )
  })
  .then( function( result ) {
    console.log( result.records[0].get("first") + " " + result.records[0].get("last") );
    session.close();
    driver.close();
  })

function sql_query(select_statement, callback) {
	var connection = mysql.createConnection({
  		host     : app.get('MYSQL_HOSTNAME'),
  		user     : app.get('MYSQL_USERNAME'),
  		password : app.get('MYSQL_PASSWORD'),
  		database : app.get('MYSQL_SCHEMA')
	});
	connection.connect();
 	connection.query(select_statement, function(err, rows, fields) {
  		if (err) {
  			callback(err, null);
  		} else {
  			callback(null, rows);
  		}	 		
	});
	connection.end();
}

// api routes
app.get('/api/checkcredentials', function(req, res) {
	var username = req.query.username;
	var password = req.query.password;

	var sql = "SELECT user_id, password FROM user WHERE email = '"+username+"';";
	sql_query(sql, function(err, results) {
		if (err) {
			res.status(500).send({accepted: false, message: err});
		}
		results = results[0];
		if (password == results.password) {
			res.send({accepted: true, message: "Credentials accepted.", user_id: results.user_id});
		} else {
			res.send({accepted: false, message: "Bad username or password."})
		}
	});
});
app.post('/api/register', function(req, res){
	var first_name = req.body.first;
	var last_name = req.body.last;
	var email = req.body.email;
	var password = req.body.password;

	var sql = "INSERT INTO user (first_name, last_name, email, password) "+
				"VALUES ('"+first_name+"', '"+last_name+"', '"+email+"', '"+password+"')";
	sql_query(sql, function(err, results) {
		if (err) {
			res.send({accepted: false, message: "ERROR: "+err});
		} else {
			res.send({accepted: true, message: "Credentials accepted."});
		}
	});

});

app.get('/', function(req, res){
	res.redirect('/login');
});

app.get('/login', function(req, res) {
	var options = {
		root: __dirname + '/public',
		dotfiles: 'deny',
		cacheControl: 'false'
	}
	res.sendFile('login.html', options);
});

app.get('/register', function(req, res) {
	var options = {
		root: __dirname + '/public',
		dotfiles: 'deny',
		cacheControl: 'false'
	}
	res.sendFile('register.html', options);
});

app.get('/profile/:user_id', function(req, res) {
	var options = {
		root: __dirname + '/public',
		dotfiles: 'deny',
		cacheControl: 'false'
	}
	res.sendFile('profile.html', options);
});

app.get('/api/getProfileInfo', function(req, res) {
	var user_id = req.query.user_id;
	var profile_info = {};
	var sql = "SELECT first_name, last_name FROM user WHERE user_id = "+user_id+";";
	sql_query(sql, function(err, results) {
		if (err) { res.status(500).send(); }
		results = results[0];
		profile_info.user_id = user_id;
		profile_info.first_name = results.first_name;
		profile_info.last_name = results.last_name;

		var sql = "SELECT post_id, description, like_value FROM post WHERE user_id = "+user_id+" ORDER BY post_id DESC;"
		sql_query(sql, function(err, posts) {
			if (err) { res.status(500).send(); }
			for (var i=0; i < posts.length; i++) {
				var post_id = posts[i].post_id;
				var sql = "SELECT c.comment_id AS comment_id, "+
					"c.description as description, "+
					"u.user_id AS user_id, "+
					"u.first_name AS first_name, "+
					"u.last_name AS last_name"+
					"FROM comment AS c, user AS u "+
					"WHERE c.user_id = u.user_id AND c.post_id = "+post_id+";"
				sql_query(sql, function(err, comments) {
					posts[i].comments = comments;
				});
			}
			profile_info.posts = posts;
			res.send(profile_info);
		});
	});
});

//for Neo4j Connectivity
app.get('/neo', function(req, res){
		res.send("Neo4j connectivity");
});
// start server
app.listen(app.get('port'), function() {
	console.log("Running on port", app.get('port'));
});

