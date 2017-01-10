'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

// Add/overwrite any additional settings here
config.server.port = 80;
// config.mongo.uri = 'mongodb://127.0.0.1:27017/webgme_my_app';

// Plugins
config.plugin.allowServerExecution = true;
//config.plugin.allowBrowserExecution = false;

// Seeds
config.seedProjects.enable = true;
config.seedProjects.basePaths = ["./src/seeds"]

validateConfig(config);
module.exports = config;
config.requirejsPaths.loader = './node_modules/webgme-to-json/';

