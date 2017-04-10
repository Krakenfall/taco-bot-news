// Third-party dependencies
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var express = require('express');
var bodyParser = require('body-parser');

// Local dependencies
var configService = require('./services/configuration.js');
var apputil = require("./util.js");
var dtg_bot = require("./dtg_bot.js");
var db = require('./db.js');

// Define constants

// Define globals

// update the commands command to point to this instance of the bot
var config = configService.GetConfigurationSync();

// Begin Express handlers
var app = express();

// Install express middleware
app.use(bodyParser.json());

// Handle root
app.get('/', function(req, res) {
	if (config.tacoBotWebUrl) { res.redirect(`${config.tacoBotWebUrl}`); }
	else { res.send("invalid request"); }
});

// Return api status
app.get('/status', function(req, res) {
	res.send('UP');
});

app.get("/log", function(req, res) {
	var logName = "server.log";
	util.readFile(logName, function(error, logData){
		if (error) {
			apputil.log(`Error retrieving log: \r\n ${error.stack}`);
			res.end(error);
		} else {
			// fs.readFileSync returns a buffer. Convert to string here
			res.send(logData.toString());
		}
	});
});

app.get("/reddit/update", function(req, res) {
	dtg_bot.run(function(error) {
		var message = "Successfully checked reddit for DTG_Bot posts";
		if (error) {
			message = `Failed when running dtg_bot:\r\n ${error.stack}`;
			apputil.log(message, null, true);
			res.send(message);
		} else {
			res.send(message);
		}
	});
});

// Handle Error response
app.use(function(err, req, res, next) {
	apputil.log("Error with server:\r\nError:\r\n" + err.stack + "\r\nStack:" + err.stack);
	res.status(500).send('Something broke!');
});

db.connect(config.mongoConnectionString, function(err) {
	if (err) {
		apputil.log(`Unable to connect to mongo. Error:\r\n${err}`);
		process.exit(1);
	}
	apputil.log("Opened db connection", null, true);

	app.listen(config.port, function () {
		apputil.log("Server listening on port " + config.port, null, true);
	});	

	apputil.log("Beginning dtg_bot loop.", null, true);
	apputil.log(`config.reddit.checkPeriodInMinutes: ${config.reddit.checkPeriodInMinutes}`, null, true);
	if (config.reddit && config.reddit.checkPeriodInMinutes) {
		dtg_bot.run(function(error) {
			if (error) {
				apputil.log("Failed when running dtg_bot:\r\n" + error.stack, null, true);
			}
		});

		setInterval(function(){
			dtg_bot.run(function(error) {
				if (error) {
					apputil.log("Failed when running dtg_bot:\r\n" + error.stack, null, true);
				}
			});
		}, config.reddit.checkPeriodInMinutes * 60 * 1000);
	}
	else {
		apputil.log("Critical: Invalid config.json. Ensure that both config.reddit and " + 
					"config.reddit.checkPeriodInMinutes exist and are correct.", null, true);
		process.exit(1);
	}
});