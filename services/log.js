'use strict';

const winston = require('winston');
require('winston-daily-rotate-file');
const fs = require('fs');

const log = {
    error: "./logs/error.log"
};

// Create log dir
if (!fs.existsSync(`./logs`)) {
    fs.mkdirSync(`./logs`);
}

// Create log files
if (!fs.existsSync(`${log.error}`)) {
    fs.writeFileSync(`${log.error}`,'');
}

var logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: `${log.error}`,
            timestamp: true,
            level: 'error' 
        }),
        new winston.transports.DailyRotateFile({
            filename: 'info.%DATE%.log',
            dirname: './logs',
            datePattern: 'YYYY-MM-DD',
            level: 'info',
            timestamp: true,
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '14d'
        })
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: './logs/unhandled-exceptions.log' })
    ],
    exitOnError: false
});

const logReader = function (logName , callback) {
    if (!log[logName]) {
        callback(`Log named ${logName} not found. Use a name found in the ` + 
              `property names below:\r\n${JSON.stringify(log)}`);
    } else {
        try {
            callback(null, fs.readFileSync(`${log[logName]}`));
        } catch (err) {
            callback(err);
        }
    }
};

const logDailyReader = function (logName , callback) {
    var now = new Date();
    var year = now.getFullYear();
    var month = (now.getMonth() + 1).toLocaleString(undefined, {minimumIntegerDigits: 2, useGrouping:false});
    var day = now.getDate().toLocaleString(undefined, {minimumIntegerDigits: 2, useGrouping:false})
    try {
        callback(null, fs.readFileSync(
            `./logs/info.${year}-${month}-${day}.log`
        ));
    } catch (err) {
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
module.exports.fileDailyRead = logDailyReader;
module.exports.fileRead = logReader;