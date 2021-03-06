
// Third-party dependencies
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var express = require('express');
var bodyParser = require('body-parser');
const winston = require('winston');
var logger = require('./services/log');

// Local dependencies
var configService = require('./services/configuration.js');
var apputil = require("./util.js");
var dtg_bot = require("./dtg_bot.js");
var db = require('./db.js');
var config = configService.GetConfigurationSync();

// Set debug logs
if (config.debug) {
	logger.add(new winston.transports.Console({
	  format: winston.format.simple(),
	  level: 'debug' 
	}));
  }

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
	logger.log('debug', 'Status is UP');
});

app.get("/log", function(req, res) {
	const log = new Date().toISOString();
	logger.fileDailyRead('info', function(error, logData){
		if (error) {
			logger.error(error);
			res.end(error);
		} else {
			// fs.readFileSync returns a buffer. Convert to string here
			res.send(logData.toString());
			logger.log('debug', 'Sent log');
		}
	});
});

app.get("/log/error", function(req, res) {
	logger.fileRead('error', function(error, logData){
		if (error) {
			logger.error(`Error retrieving log: \r\n ${error.toString()}`);
			res.end(error);
		} else {
			// fs.readFileSync returns a buffer. Convert to string here
			res.send(logData.toString());
			logger.log('debug', 'Sent error log');
		}
	});
});

// Handle Error response
app.use(function(err, req, res, next) {
	logger.error("Error with server:\r\nError:\r\n" + err.stack + "\r\nStack:" + err.stack);
	res.status(500).send('Something broke!');
});

db.connect(config.mongoConnectionString, function(err) {
	if (err) {
		logger.error(`Unable to connect to mongo. Error:\r\n${err}`);
		process.exit(1);
	}
	logger.info("Opened db connection", null, true);

	app.listen(config.port, function () {
		logger.info("Server listening on port " + config.port, null, true);
	});	

	logger.info("Beginning dtg_bot loop.", null, true);
	logger.info(`config.reddit.checkPeriodInMinutes: ${config.reddit.checkPeriodInMinutes}`, null, true);
	if (config.reddit && config.reddit.checkPeriodInMinutes) {
		dtg_bot.run(function(error) {
			if (error) {
				logger.error("Failed when running dtg_bot:\r\n" + error.stack, null, true);
			}
		});

		setInterval(function(){
			dtg_bot.run(function(error) {
				if (error) {
					logger.error("Failed when running dtg_bot:\r\n" + error.stack, null, true);
				}
			});
		}, config.reddit.checkPeriodInMinutes * 60 * 1000);
	}
	else {
		logger.error("Critical: Invalid config.json. Ensure that both config.reddit and " + 
					"config.reddit.checkPeriodInMinutes exist and are correct.", null, true);
		process.exit(1);
	}
});