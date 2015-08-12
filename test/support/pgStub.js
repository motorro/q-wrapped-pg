/**
 * Stub for testing pg queries
 * User: motorro
 * Date: 03.02.2015
 * Time: 7:30
 */
"use strict";

/**
 * Node-postgres client stub
 * @param {string|Object} config Stub configuration
 * @param {Object} [config.connectionError=null] Call to 'connect' will fail with this error
 * @param {Object} [config.queryError=null] Call to 'query' will fail with this error
 * @param {Object} [config.queryResult=null] Call to 'connect' will result with this object
 * @param {Function} [config.queryValidator=null] The function passed will receive two params:
 *          - query - Query passed to pg.query
 *          - args  - Query args
 *          The result returned from this function will go to query error
 *          You may also return an object:
 *          {
 *              err: {} // Will go to error
 *              result: {} //Will go to result
 *          }
 *
 * @constructor
 */
function Client(config) {
    if (undefined === config) config = {};
    if ("string" === typeof config) config = { str: config };
    this.config = config;
    /**
     * Flag to indicate 'end' was called
     * @type {boolean}
     */
    this.destroyed = false;
}

/**
 * Connect stub
 * See constructor options for details
 * @param callback
 */
Client.prototype.connect = function(callback) {
    var that = this;
    var config = that.config || module.exports.defaults;
    process.nextTick(function(){
        var err = config && config.connectionError || null;
        callback(err);
    });
};

/**
 * Query stab
 * See constructor for details
 * @param query
 * @param args
 * @param callback
 */
Client.prototype.query = function(query, args, callback) {
    var that = this;
    process.nextTick(function(){
        var config = that.config || module.exports.defaults;
        if (null == config) {
            return callback();
        } else {
            var err = config.queryError || null;
            var result = config.queryResult || null;
            if ("function" === typeof config.queryValidator) {
                var validationResult = config.queryValidator(query, args);
                if (validationResult && "object" === typeof validationResult) {
                    err = validationResult.err || null;
                    result = validationResult.result || null;
                } else {
                    err = validationResult;
                }
            }
            return callback(err, result);
        }
    });
};

/**
 * Cleanup function
 */
Client.prototype.end = function() {
    this.destroyed = true;
};

module.exports = {
    Client: Client,
    /**
     * Stubs pg.connect. See Client for options description
     * @param {string|Object} config
     * @param {Function} callback
     */
    connect: function (config, callback) {
        var client = new Client(config);
        client.connect(function(err) {
            if (err) {
                callback(err);
            } else {
                callback(undefined, client, function() {
                   client.end();
                });
            }
        })
    }
};

