var fs = require("fs");
var http = require("http");
var request = require("request");
var apputil = require("./util.js");
var util = require("util");
var rawjs = require("raw.js");
var reddit = new rawjs("raw.js monitor of DTG_Bot by https://github.com/Krakenfall/taco-bot-news");
var db = require('./db.js');

var isPostedWithinCheckPeriod = function (postedDate, checkPeriodInMinutes) {
	var cutOffTime = Math.floor(new Date().getTime()/1000.0) - (checkPeriodInMinutes * 60);
	if (postedDate >= cutOffTime) {
		return true;
	} else { return false;}
};

var getCommands = function(callback) {
	db.get().collection("commands").find().toArray(function(error, results) {
		if (error) {
			apputil.log(`Error retrieving commands: ${error}`);
			callback(error);
		} else {
			callback(null, results);
		}
	});	
};

var searchByName = function(name, array) {
	for (var i = 0; i < array.length; i++) {
		if (array[i].name === name) {
			return array[i]
		}
	}
};

var updateCommandValue = function(command) {
	db.get().collection("commands").update({_id: command._id}, {$set: {value: command.value}}, function(e, result) {
		if (e) { apputil.log(`Error updating command: ${e}`, null, true); }
		else { apputil.log(`Successfully updated command`, null, true); }
	});	
};

var run = function(callback) {
	var config = require('./config.json');
	var redditConfig = config.reddit;
	apputil.log("Authenticating...");
	reddit.setupOAuth2(redditConfig.clientId, redditConfig.secretId);
	apputil.log("Done.");

	apputil.log(`Retrieving submitted for ${redditConfig.monitorUserName}...`);

	/*
		1. Get latest posts
		2. Read saved posts
		3. Process latest posts
		4. Gather posts from given time period
		5. Send new posts to GroupMe
		6. Add new posts to saved posts
		7. Write saved posts to file
	*/
	try {
	reddit.userLinks({user: redditConfig.monitorUserName, r: redditConfig.monitorSubreddit}, function(err, response) {
		if (!err) {
		// Process latest posts
		//apputil.log("Filtering reddit posts...");
		var posts = [];		
		for (var i = 0; i < response.children.length; i++) {
			var data = response.children[i].data;
			var post = new Object();
			post.id = data.id;
			post.title = data.title;
			post.subreddit = data.subreddit;
			post.author = data.author;
			post.is_self = data.is_self;
			post.url = data.url;
			post.created = data.created;
			post.created_utc = data.created_utc;
			posts.push(post);
		}
		//apputil.log("Checking for new posts...");
		// Compare latest to saved posts
		var newPosts = [];
		for (var j = 0; j < posts.length; j++) {
			if (isPostedWithinCheckPeriod(posts[j].created_utc, redditConfig.checkPeriodInMinutes)) {
				apputil.log("New post: " + posts[j].title, null, true);
				newPosts.push(posts[j]);
				// Send to GroupMe
				var postUrl = posts[j].url;
				var postTitle = posts[j].title;
				apputil.log("Sending new link to GroupMe...", null, true);
				apputil.groupme_text_post(postUrl, function(err) {
					if (config.dtgCommandUpdates && config.dtgCommandUpdates.length > 0) {
						getCommands(function(getCommandsError, commands) {
							if (!getCommandsError) {
								for (var k = 0; k < config.dtgCommandUpdates.length; k++) {
									if (config.dtgCommandUpdates[k].redditFilter && 
										postTitle.indexOf(config.dtgCommandUpdates[k].redditFilter) > -1) {
										var command = searchByName(
											config.dtgCommandUpdates[k].name.toLowerCase(), commands);
										command.value = [postUrl];
										updateCommandValue(command);
										break;
									}
								}
							}
						});
					}
				});
				
			}
		}			
	} else {
		apputil.log("Error:\r\n" + err.stack, null, true);
		callback(err);
	}
	});
	} catch(error) {
		apputil.log("ERROR: Something went wrong: \r\n" + error.stack, null, true);
		callback(error);
	}
}

module.exports = {
	run: run
};