var fs = require('fs');
var http = require('http');
var request = require('request');
var configService = require('./services/configuration.js');
var db = require('./db.js');
const logger = require('./services/log');

var getFileContents = function(filename, callback) {
	var contents = null;
	try {
		contents = fs.readFileSync(filename);
		callback(null, contents);
	} catch(err) {
		callback("Error: Could not read file " + filename + "\r\n" + err);
	}
};

var groupme_text_post = function(text, groupId, callback) {
	var bot = null;
	db.get().collection("bots").find().toArray(function(error, bots) {
		if (error) {
			logger.error(`Error retrieving bots: ${error}`);
		} else {
			bot = bots.find(o => o.groupId === groupId);
			try {
				var message = "Success! Posted:\r\n";

				request.post("https://api.groupme.com/v3/bots/post"
					, {json: {"bot_id": bot.id, "text": text}}
					, (error, response, body) => {
						if (!error && response.statusCode >= 200 && response.statusCode < 300) {
							message = `${message}${text} Response: \r\n${body}`;
							callback(null, message);
						}
						else {
							logger.error(`Failed sending message with status code ${response.statusCode}`);
							logger.error(`Failed to send message with text:\r\n${text}`);
							callback(error);
						}
					}
				);
			}
			catch (err) {
				logger.error(err);
			}
		}
	});
};

function shuffle(list) {
    for(var j, x, i = list.length; i; j = parseInt(Math.random() * i), x = list[--i], list[i] = list[j], list[j] = x);
    return list;
};

module.exports = {
	readFile: getFileContents,
	groupme_text_post: groupme_text_post,
	shuffle: shuffle
};
