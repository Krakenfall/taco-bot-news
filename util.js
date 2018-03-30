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

var groupme_text_post = function(text, groupId) {
	var bot = null;
	db.get().collection("bots").find().toArray(function(error, bots) {
		if (error) {
			logger.error(`Error retrieving bots: ${error}`);
		} else {
			bot = bots.find(o => o.groupId === groupId);
			try {
				request.post("https://api.groupme.com/v3/bots/post"
					, {json: {"bot_id": bot.id, "text": text}}
					, (error, response, body) => {
						if (!error && response.statusCode >= 200 && response.statusCode < 300) {
							logger.info(`Successfully posted to GroupMe: ${text}`);
						}
						else {
							logger.error(`Failed sending message.` + 
										`\tStatus code: ${response.statusCode}` +
										`\tText: ${text}` +
										`\tError: ${error}`);
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

module.exports = {
	readFile: getFileContents,
	groupme_text_post: groupme_text_post
};
