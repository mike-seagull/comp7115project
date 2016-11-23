var express = require('express');
var path = require('path');
var app = express();
var bodyParser 	= require('body-parser');
var mysql      	= require('mysql');
var cookieParser= require('cookie-parser');
var neo4j = require('neo4j-driver').v1;

// app variables
app.set('port', (process.env.PORT || 3000));
app.set('MYSQL_HOSTNAME', 'sp6xl8zoyvbumaa2.cbetxkdyhwsb.us-east-1.rds.amazonaws.com');
app.set('MYSQL_USERNAME', 'a0i3kvl4stvs4dvh');
app.set('MYSQL_PASSWORD', 'vyrzttz9k2q9na2r');
app.set('MYSQL_SCHEMA', 'b6spocrisll4z0jk');

app.set('NEO4J_BOLT', 'bolt://hobby-fplmbomjfhocgbkelakdbenl.dbs.graphenedb.com:24786');
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
app.use(cookieParser());

// bootstrap stuff
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap

var driver = neo4j.driver(app.get('NEO4J_BOLT'), neo4j.auth.basic(app.get('NEO4J_USERNAME'), app.get('NEO4J_PASSWORD')));

var session = driver.session();

//sample cypher query for neo4j
/*
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
*/
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
	var sql = "SELECT user_id, password, first_name, last_name FROM user WHERE email = '"+username+"';";
	sql_query(sql, function(err, results) {
		if (err) {
			res.status(500).send({accepted: false, message: err});
		}
		results = results[0];
		if (password == results.password) {
			res.cookie('user', results, { maxAge: 600000 });
			res.send({accepted: true, message: "Credentials accepted.", user_id: results.user_id});
		} else {
			res.send({accepted: false, message: "Bad username or password."})
		}
	});
});
app.delete('/api/sign-out', function(req, res) {
	res.clearCookie('user');
	res.send({success: true});
});
app.post('/api/register', function(req, res){
	var first_name = req.body.first;
	var last_name = req.body.last;
	var email = req.body.email;
	var password = req.body.password;
	var use_neo4j = req.body.useNeo4J;

	if (use_neo4j) {
		console.log("Going to use Neo");
	} else {
		var sql = "INSERT INTO user (first_name, last_name, email, password) "+
					"VALUES ('"+first_name+"', '"+last_name+"', '"+email+"', '"+password+"')";
		sql_query(sql, function(err, results) {
			if (err) {
				res.status(500).send({accepted: false, message: "ERROR: "+err});
			} else {
				res.send({accepted: true, message: "Credentials accepted."});
			}
		});
	}



});
app.post('/api/newPost', function(req, res) {
	var user_id = req.body.user_id;
	var post = req.body.post;

	var sql = "INSERT INTO post (description, user_id) "+
				"VALUES ('"+post+"', '"+user_id+"')";
	sql_query(sql, function(err, results) {
		if (err) {
			res.status(500).send({accepted: false, message: err});
		} else {
			res.send({accepted: true, message: "Comment accepted"});
		}
	})
});
app.post('/api/newComment', function(req, res) {
	var user_id = req.cookies.user.user_id;
	var post_id = req.body.post_id;
	var comment = req.body.comment;

	var sql = "INSERT INTO comment (description, user_id, post_id) "+
				"VALUES ('"+comment+"', '"+user_id+"', '"+post_id+"')";
	sql_query(sql, function(err, results) {
		if (err) {
			res.status(500).send({accepted: false, message: err});
		} else {
			res.send({accepted: true, message: "Comment accepted"});
		}
	})
});

app.get('/', function(req, res){
	console.log(req.cookies);
	if(req.cookies.user) {
		 res.redirect('/profile/'+req.cookies.user.user_id);
	} else {
		res.redirect('/login');
	}
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
app.get('/api/getSessionInfo', function(req, res) {
	if (req.cookies.user) {
		res.send(req.cookies.user);
	} else {
		res.send(null);
	}
});

app.get('/reply/:user_id/:post_id', function(req, res) {
	var options = {
		root: __dirname + '/public',
		dotfiles: 'deny',
		cacheControl: 'false'
	}
	res.sendFile('replyToPost.html', options);
});
app.get('/main-feed', function(req, res) {
	var options = {
		root: __dirname + '/public',
		dotfiles: 'deny',
		cacheControl: 'false'
	}
	res.sendFile('main.html', options);
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
		else {
			var result = results[0];
			res.send(result);
		}
	});
});
app.get('/api/getPostsForUser', function(req, res) {
	var user_id = req.query.user_id;
	var post_id = req.query.post_id;
	if (post_id === undefined || post_id === null) {
		var sql = "SELECT first_name, last_name, post_id, description, like_value FROM post AS p, user AS u WHERE u.user_id = "+user_id+" AND p.user_id = "+user_id+" ORDER BY post_id DESC;";
	} else {
		var sql = "SELECT first_name, last_name, post_id, description, like_value FROM post AS p, user AS u WHERE u.user_id = "+user_id+" AND p.user_id = "+user_id+" AND post_id = "+post_id+";";
	}
	sql_query(sql, function(err, posts) {
		if (err) { 
			res.status(500).send(); 
		} else { 
			res.send(posts);
		}
	});
});
app.get('/api/getCommentsForPost', function(req, res) {
	var post_id = req.query.post_id;
	var sql = "SELECT c.comment_id, c.description, u.user_id, u.first_name, u.last_name, c.post_id "+
		"FROM comment AS c, user AS u WHERE c.user_id = u.user_id AND c.post_id = "+post_id+";"
	sql_query(sql, function(err, comments) {
		res.send(comments);
	});
});
app.get('/api/getFollowerFeed', function(req, res) {
	var user_id = req.cookies.user.user_id;
	var sql = "SELECT p.post_id, p.description FROM post p, follower f "+
		"WHERE f.follower_id = p.user_id AND f.user_id = "+user_id+";";
	sql_query(sql, function(err, followers_posts) {
		res.send(followers_posts);
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

