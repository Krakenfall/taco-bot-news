'use strict';

const winston = require('winston');
const fs = require('fs');
const now = new Date();

const log = {
    error: "./logs/error.log",
    info: "./logs/info.log" 
};

if (!fs.existsSync(`${log.error}`)) {
    fs.writeFileSync(`${log.error}`,'');
}
if (!fs.existsSync(`${log.info}`)) {
    fs.writeFileSync(`${log.info}`,'');
}

var logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({ timestamp: true }),
        new winston.transports.File({ 
            filename: `${log.info}`,
            timestamp: true,
            level: 'info',
        }),
        new winston.transports.File({
            filename: `${log.error}`,
            timestamp: true,
            level: 'error' 
        })
    ],
    exitOnError: false
});

const logReader = function (logName , callback) {
    if (!log[logName]) {
        throw `Log named ${logName} not found. Use a name found in the` + 
              `property names below:\r\n${JSON.stringify(log)}`
    }
    try {
        callback(null, fs.readFileSync(`${log[logName]}`));
    } catch(err) {
        callback(err);
    }
};

module.exports = logger;
module.exports.stream = {
    write: function(message, encoding) {
        logger.info(message);
        console.log(message);
    }
};
module.exports.fileRead = logReader;