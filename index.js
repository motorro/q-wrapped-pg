/**
 * q-wrapped-pg
 * User: motorro
 * Date: 08.12.2014
 * Time: 6:54
 */

"use strict";

var Q = require("q");

var pg, connect;
/**
 * Resets pg instance to use
 * Useful to pass an existent pg (say with set defaults) to wrapper
 * @param instance
 */
function setPg(instance) {
    pg = instance;
    connect = Q.nbind(pg.connect, pg);
}
setPg(require("pg"));

/**
 * Checks that operation is a function
 * @param {Function} operation Function to check
 * @returns {Function}
 * @private
 */
function _checkOperation(operation) {
    if ("function" !== typeof operation) {
        throw new TypeError("Passed 'operation' should be a function!")
    }
    return operation;
}

/**
 * Performs operation taking a connection from connection pool
 * Pooling is made using `config` as a key as described in original documentation
 * @param {string|Object} config Connection string or options. If omitted (passing operation as a first arg)
 *                               the environment variables or pg.defaults will be used. Use exported `pg` to
 *                               set defaults.
 * @param {Function} operation Operation to perform. Established connection is passed as an argument
 * @param {...*} [operationArgs] Operation arguments
 * @returns {Q.promise}
 */
function performOnPooledConnection (config, operation) {
    var sliceFrom = 2;
    if ("function" === typeof config) {
        operation = config;
        config = null;
        sliceFrom = 1;
    }
    operation = _checkOperation(operation);
    var opArgs = Array.prototype.slice.call(arguments, sliceFrom);
    return connect(config).spread(function(client, done){
        return Q(operation).fapply([client].concat(opArgs)).finally(done);
    });
}

/**
 * Performs operation on a non-pooled connection
 * @param {string|Object} config Connection string or options. If omitted (passing operation as a first arg)
 *                               the environment variables or pg.defaults will be used. Use exported `pg` to
 *                               set defaults.
 * @param {Function} operation Operation to perform. Established connection is passed as an argument
 * @param {...*} [operationArgs] Operation arguments
 * @returns {Q.promise}
 */
function performOnNonPooledConnection (config, operation) {
    var sliceFrom = 2;
    if ("function" === typeof config) {
        operation = config;
        config = null;
        sliceFrom = 1;
    }
    operation = _checkOperation(operation);
    var opArgs = Array.prototype.slice.call(arguments, sliceFrom);
    var client = new pg.Client(config);
    return Q.ninvoke(client, "connect").then(function(){
        return Q(operation).fapply([client].concat(opArgs)).finally(function(){ client.end(); });
    });
}

/**
 * Performs query on pooled connection using pg.defaults or environment variables.
 * Similar to [node-pg-query](https://github.com/brianc/node-pg-query)
 * @param {string} sql SQL Query
 * @param {object[]} [params] Optional query params
 * @returns {Q.Promise} Array: [rows, result]
 */
function performPooledQuery (sql, params) {
    return performOnPooledConnection(function(client) {
        return Q.ninvoke(client, 'query', sql, params);
    }).then(function (result) {
        return [result.rows, result];
    });
}

module.exports = {
    /**
     * Node-postgres to avoid extra require and to take defaults from
     */
    pg: pg,
    /**
     * Resets pg instance to use
     * Useful to pass an existent pg (say with set defaults) to wrapper
     * @param instance
     */
    setPg: function(instance) {
        this.pg = instance;
        setPg(instance);
    },
    /**
     * Performs operation taking a connection from connection pool
     * Pooling is made using `config` as a key as described in original documentation
     * @param {string|Object} config Connection string or options. If omitted (passing operation as a first arg)
     *                               the environment variables or pg.defaults will be used. Use exported `pg` to
     *                               set defaults.
     * @param {Function} operation Operation to perform. Established connection is passed as an argument
     * @param {...*} [operationArgs] Operation arguments
     * @returns {Q.promise}
     */
    pooled: performOnPooledConnection,
    /**
     * Performs operation on a non-pooled connection
     * @param {string|Object} config Connection string or options. If omitted (passing operation as a first arg)
     *                               the environment variables or pg.defaults will be used. Use exported `pg` to
     *                               set defaults.
     * @param {Function} operation Operation to perform. Established connection is passed as an argument
     * @param {...*} [operationArgs] Operation arguments
     * @returns {Q.promise}
     */
    nonPooled: performOnNonPooledConnection,
    /**
     * Performs query on pooled connection using pg.defaults or environment variables.
     * Similar to [node-pg-query](https://github.com/brianc/node-pg-query)
     * @param {string} sql SQL Query
     * @param {object[]} [params] Optional query params
     * @returns {Q.Promise} Array: [rows, result]
     */
    query: performPooledQuery
};