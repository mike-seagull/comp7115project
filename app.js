var express = require('express');
var path = require('path');
var app = express();
var bodyParser 	= require('body-parser');
var mysql      	= require('mysql');
var cookieParser= require('cookie-parser');
var neo4j = require('neo4j-driver').v1;
var neo4j2 = require('neo4j');
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
app.set("AVATAR_DIR", path.join(__dirname, "public", "avatars"));
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

var db = new neo4j2.GraphDatabase(app.get('NEO4J_URL'));

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

// from Michael
// this driver may be a little weird
// going to write function using a different one
function cql_query(cql) {
session
  .run( cql )
  //.then( function()
  //{
  //  return session.run( "MATCH (a:User) WHERE a.first_name = 'Ruchi' RETURN a.first_name AS first, a.last_name AS last" )
  //})
  .then( function( result ) {
  //  console.log( result.records[0].get("first") + " " + result.records[0].get("last") );
    session.close();
    driver.close();
  });
}

function neo_query(cql, callback) {
	db.cypher({query: cql}, function (err, results) {
    	if (err) {
    		callback(err, null);
    	}
    	callback(null, results);
	});
}


// basic routes
app.get('/', function(req, res){
	if(req.cookies.user) {
		 //res.redirect('/profile/'+req.cookies.user.user_id);
		 res.redirect('/main-feed');
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
app.get('/main-feed', function(req, res) {
	var options = {
		root: __dirname + '/public',
		dotfiles: 'deny',
		cacheControl: 'false'
	}
	if (req.cookies.user) {
		res.sendFile('main.html', options);
	} else {
		res.redirect('/login');
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

app.get('/profile/:user_id', function(req, res) {
	var options = {
		root: __dirname + '/public',
		dotfiles: 'deny',
		cacheControl: 'false'
	}	
	res.sendFile('profile.html', options);
});

// api routes
app.get('/api/checkcredentials', function(req, res) {
	var username = req.query.username;
	var password = req.query.password;
	var use_neo4j = req.query.useNeo4J;
	console.log(use_neo4j);

	if (use_neo4j == true) {
		console.log("Going to use Neo");
		var sql = "MATCH (usr: User) WHERE usr.email = \""+username+"\" RETURN usr.first_name, usr.last_name, usr.password";
		neo_query(sql, function(err, results) {
			if (err) {
				res.status(500).send({accepted: false, message: err});
			} 
			if (password == results.password) {
				res.cookie('user', results, { maxAge: 600000 });
				res.send({accepted: true, message: "Credentials accepted.", user_id: results.user_id});
			} else {
				res.send({accepted: false, message: "Bad username or password."})
			}
		});
	} else {
		var sql = "SELECT user_id, password, first_name, last_name FROM user WHERE email = '"+username+"';";
		sql_query(sql, function(err, results) {
			if (err) {
				res.status(500).send({accepted: false, message: err});
			}
			results = results[0];
			results.useNeo4J = false;
			if (password == results.password) {

				res.cookie('user', results, { maxAge: 600000 });

				res.send({accepted: true, message: "Credentials accepted.", user_id: results.user_id});
			} else {
				res.send({accepted: false, message: "Bad username or password."})
			}
		});
	}
});
app.get('/uploadAvatar', function(req, res) {
	var options = {
		root: __dirname + '/public',
		dotfiles: 'deny',
		cacheControl: 'false'
	}
	res.sendFile('uploadAvatar.html', options);
});
app.post('/uploadAvatar', function(req, res) {
	var avatar = req.files.avatar;
	var user_id = req.cookies.user.user_id;
	fs.rename(avatar.path, path.join(app.get("AVATAR_DIR"), user_id+path.extname(avatar.name)), function (err) {
		if (err) {
			res.send({error: err});
		} else {
			res.redirect('/profile/')
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
		var sql = "CREATE (a:User {first_name: \""+first_name+"\", last_name: \""+last_name+"\", email: \""+email+"\", password: \""+password+"\"})";
		neo_query(sql, function(err, results){
			if(err) {
				res.status(500).send({accepted: false, message: "ERROR: "+err});
			} else {
				res.send({accepted: true, message: "Credentials accepted."});
			}
		});
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
	var use_neo4j = req.body.useNeo4J;

	if (use_neo4j) {
		console.log("Going to use Neo");
		var sql = "CREATE (a:Post {description: \""+post+"\", user_id: "+user_id+"})";
		neo_query(sql, function(err, results){
			if(err) {
				res.status(500).send({accepted: false, message: "ERROR: "+err});
			} else {
				res.send({accepted: true, message: "Post Created Successfully."});
			}
		});
	}
	else
	{
		var sql = "INSERT INTO post (description, user_id) "+
					"VALUES ('"+post+"', '"+user_id+"')";
		sql_query(sql, function(err, results) {
			if (err) {
				res.status(500).send({accepted: false, message: err});
			} else {
				res.send({accepted: true, message: "Comment accepted"});
			}
		})
	}
});
app.post('/api/newComment', function(req, res) {
	var user_id = req.cookies.user.user_id;
	var post_id = req.body.post_id;
	var comment = req.body.comment;
	var use_neo4j = req.body.useNeo4J;

	if (use_neo4j) {
		console.log("Going to use Neo");
		var sql = "CREATE (a:Comment {description: \""+comment+"\", user_id: "+user_id+", post_id: "+post_id+"})";
		neo_query(sql, function(err, results){
			if(err) {
				res.status(500).send({accepted: false, message: "ERROR: "+err});
			} else {
				res.send({accepted: true, message: "Comment Created Successfully."});
			}
		});
	} else {
		var sql = "INSERT INTO comment (description, user_id, post_id) "+
					"VALUES ('"+comment+"', '"+user_id+"', '"+post_id+"')";
		sql_query(sql, function(err, results) {
			if (err) {
				res.status(500).send({accepted: false, message: err});
			} else {
				res.send({accepted: true, message: "Comment accepted"});
			}
		})
	}
});

app.get('/api/getSessionInfo', function(req, res) {
	if (req.cookies.user) {
		res.send(req.cookies.user);
	} else {
		res.send(null);
	}
});

app.get('/api/getProfileInfo', function(req, res) {
	var user_id = req.query.user_id;
	var profile_info = {};
	var use_neo4j = req.body.useNeo4J;
	//var use_neo4j = true;

	if (use_neo4j) {
		console.log("Going to use Neo");
		var sql = "MATCH (usr: User) WHERE usr.user_id = \""+user_id+"\" RETURN usr.first_name, usr.last_name";
		neo_query(sql, function(err, results){
			if(err) {
				res.status(500).send();
			} else {
				var result = results[0];
				res.send(result);
			}
		});
	}
	else
	{
	var sql = "SELECT first_name, last_name FROM user WHERE user_id = "+user_id+";";
	sql_query(sql, function(err, results) {
		if (err) { res.status(500).send(); }
		else {
			var result = results[0];
			res.send(result);
		}
	});
	}
});
app.get('/api/getPostsForUser', function(req, res) {
	var user_id = req.query.user_id;
	var post_id = req.query.post_id;
	var use_neo4j = req.body.useNeo4J;

	if (use_neo4j) {
		console.log("Going to use Neo");
		if (post_id === undefined || post_id === null) {
			var sql = "MATCH (usr: User)-[:posts]->(pt: Post) WHERE usr.user_id = \""+user_id+"\" AND pt.user_id = \""+user_id+"\" 
						RETURN usr.first_name,usr.last_name,pt.description";
		} else {
			var sql = "MATCH (usr: User)-[:posts]->(pt: Post) WHERE usr.id = \""+user_id+"\" AND pt.user_id = \""+user_id+"\" AND pt.id = \""+post_id+"\" RETURN usr.first_name,usr.last_name,pt.description";
		}
		neo_query(sql, function(err, posts) {
			if (err) { 
				res.status(500).send(); 
			} else { 
				res.send(posts);
			}
		});

		
	}
	else {
		if (post_id === undefined || post_id === null) {
			var sql = "SELECT first_name, last_name, post_id, description, like_value "+
				"FROM post AS p, user AS u "+
				"WHERE u.user_id = "+user_id+" AND p.user_id = "+user_id+" ORDER BY post_id DESC;";
		} else {
			var sql = "SELECT first_name, last_name, post_id, description, like_value "+
				"FROM post AS p, user AS u "+
				"WHERE u.user_id = "+user_id+" AND p.user_id = "+user_id+" AND post_id = "+post_id+";";
		}
		sql_query(sql, function(err, posts) {
			if (err) { 
				res.status(500).send(); 
			} else { 
				res.send(posts);
			}
		});
	}
	
});
app.get('/api/getCommentsForPost', function(req, res) {
	var post_id = req.query.post_id;
	var use_neo4j = req.body.useNeo4J;
	//var use_neo4j = true;

	if (use_neo4j) {
		console.log("Going to use Neo");
	}
	else
	{
		var sql = "SELECT c.comment_id, c.description, u.user_id, u.first_name, u.last_name, c.post_id "+
		"FROM comment AS c, user AS u WHERE c.user_id = u.user_id AND c.post_id = "+post_id+";"
	sql_query(sql, function(err, comments) {
		res.send(comments);
	});
	}
});
app.get('/api/getMainFeed', function(req, res) {
	var user_id = req.cookies.user.user_id;
	var use_neo4j = req.body.useNeo4J;
	//var use_neo4j = true;

	if (use_neo4j) {
		console.log("Going to use Neo");
	}
	else {
		var sql = "SELECT p.post_id, p.description, u.first_name, u.last_name, f.follower_id AS user_id "+
			"FROM post p "+
			"JOIN follower f ON p.user_id=f.follower_id "+
			"JOIN user u ON f.follower_id = u.user_id "+
			"WHERE f.user_id = "+user_id+" OR p.user_id = "+user_id+
			" ORDER BY post_id DESC;"
		sql_query(sql, function(err, followers_posts) {
			res.send(followers_posts);
		});
	}
});
app.get('/api/getFollowers', function(req, res) {
	var user_id = req.cookies.user.user_id;
	if (user_id === undefined || user_id === null) {
		res.send({err: "not logged in"})
	}
	var sql = "SELECT follower_id FROM follower WHERE user_id = "+user_id+";";
	sql_query(sql, function(err, followers) {
		followers.err = null;
		res.send(followers);
	});
});
app.post('/api/followUser', function(req, res) {
	var user_id = req.cookies.user.user_id;
	var follower_id = req.body.user_id;
	if (user_id === 0 || follower_id === 0) {
		res.send({error: "error getting user_id or follower_id"});
	}
	var sql = "INSERT INTO follower (user_id, follower_id) "+
		"VALUES ('"+user_id+"', '"+follower_id+"');";
	sql_query(sql, function(err, data) {
		res.send({error: null});
	});
});
app.delete('/api/unfollowUser', function(req, res) {
	var user_id = req.cookies.user.user_id;
	var follower_id = req.body.user_id;
	var sql = "DELETE from follower "+
		"WHERE user_id = "+user_id+" AND follower_id = "+follower_id+";"
	console.log(sql);
	sql_query(sql, function(err, data) {
		if (err) {
			res.send({error: err});
		} else {
			res.send({error: null});
		}
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
