var fs = require("fs");
var http = require("http");
var request = require("request");
var apputil = require("./util.js");
var util = require("util");
var rawjs = require("raw.js");
var reddit = new rawjs("raw.js monitor of DTG_Bot by https://github.com/Krakenfall/taco-bot-news");
var db = require('./db.js');
const logger = require('./services/log');

var isInCheckPeriod = function (postedDate, checkPeriodInMinutes) {
	var cutOffTime = Math.floor(new Date().getTime()/1000.0) - (checkPeriodInMinutes * 60);
	if (postedDate >= cutOffTime) {
		return true;
	} else { return false;}
};

var matchesFilter = function (title, filters) {
	var matches = false;
	for (var i = 0; i < filters.length; i++) {
		if (title.indexOf(filters[i]) > -1) {
			matches = true;
			logger.log('debug',
					`New post matches filter. Not posting.\r\n` + 
					`\tPost title: ${title}\r\n` +
					`\tMatching Filter: ${filters[i]}`);
		}
	}
	return matches;
};

var getCommands = function(callback) {
	db.get().collection("commands").find().toArray(function(error, results) {
		if (error) {
			logger.error(`Error retrieving commands: ${error}`);
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
		if (e) { logger.error(e); }
		else { logger.info(`Successfully updated command ${command.name}`); }
	});	
};

var updateCommands = function (postTitle, postUrl, updates) {
	getCommands(function(getCommandsError, commands) {
		if (!getCommandsError) {
			for (var k = 0; k < updates.length; k++) {
				if (updates[k].redditFilter && 
					postTitle.indexOf(updates[k].redditFilter) > -1) {
					var command = searchByName(
						updates[k].name.toLowerCase(), commands);
					command.value = [postUrl];
					updateCommandValue(command);
					break;
				}
			}
		} else {
			logger.error(getCommandsError);
		}
	});
}

var run = function(callback) {
	var config = require('./config.json');
	var redditConfig = config.reddit;
	logger.log('debug', "Authenticating...");
	reddit.setupOAuth2(redditConfig.clientId, redditConfig.secretId);
	logger.log('debug', "Done.");

	logger.log('debug', `Retrieving submitted for ${redditConfig.monitorUserName}...`);

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
		//logger.info("Filtering reddit posts...");
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
		//logger.info("Checking for new posts...");
		// Compare latest to saved posts
		var newPosts = [];
		for (var j = 0; j < posts.length; j++) {
			var url = posts[j].url;
			var title = posts[j].title;
			if (isInCheckPeriod(posts[j].created_utc, redditConfig.checkPeriodInMinutes)){ 				
				// Update commands
				if (config.dtgCommandUpdates && config.dtgCommandUpdates.length > 0) {
					updateCommands(title, url, config.dtgCommandUpdates);					
				}
				// Send to GroupMe
				if (!matchesFilter(title, redditConfig.filters)) {				
					logger.info(`New post does not match any filters. Send to GroupMe:\r\n` + 
								`\tPost title: ${title}\r\n` +
								`\tLink: ${url}`);
					newPosts.push(posts[j]);
					apputil.groupme_text_post(url, redditConfig.targetGroupMeGroupId);
				}
			}
		}			
	} else {
		logger.error(err);
		callback(err);
	}
	});
	} catch(error) {
		logger.error("ERROR: Something went wrong: \r\n" + error.stack);
		callback(error);
	}
}

module.exports = {
	run: run
};