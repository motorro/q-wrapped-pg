/**
 * q-wrapped-pg
 * User: motorro
 * Date: 08.12.2014
 * Time: 6:54
 */

"use strict";

var Q = require("q");
var OperationWrapper = require("./lib/OperationWrapper");
var TransactionWrapper = require("./lib/TransactionWrapper");

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
 * Checks if passed operation is a function or a command-wrapper
 * @param operation
 * @returns {boolean}
 * @private
 */
function _isOperation(operation) {
    return null != operation && ("function" === typeof operation || OperationWrapper.isCommand(operation));
}

/**
 * Check if operation is already wrapped by any of wrappers
 * If not - wraps with default wrapper
 * Checks if supplied operation looks like a command pattern to be more flexible
 * @param {Function/OperationWrapper} operation
 * @returns {OperationWrapper}
 * @private
 */
function _checkOperation(operation) {
    return ("function" === typeof operation.execute) ? operation : new OperationWrapper(operation);
}

/**
 * Utility function to spread function arguments between operation and pg function.
 * Used to call methods without connect options (using defaults).
 * @param {*[]} args Query function arguments
 * @returns {Object} Operation, connection options and operation arguments
 * @private
 */
function _spreadArgs(args) {
    var sliceFrom;
    var config = args[0];
    var operation;
    if (_isOperation(config)) {
        operation = config;
        config = null;
        sliceFrom = 1;
    } else {
        operation = args[1];
        sliceFrom = 2;
    }

    return {
        operation: _checkOperation(operation),
        config: config,
        opArgs: Array.prototype.slice.call(args, sliceFrom)
    };
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
    var args = _spreadArgs(arguments);
    return connect(args.config).spread(function(client, done){
        return args.operation.execute.apply(void 0, [client].concat(args.opArgs)).finally(done);
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
    var args = _spreadArgs(arguments);
    var client = new pg.Client(args.config);
    return Q.ninvoke(client, "connect").then(function(){
        return args.operation.execute.apply(void 0, [client].concat(args.opArgs)).finally(function(){ client.end(); });
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
        return Q.ninvoke(client, "query", sql, params);
    }).then(function (result) {
        return [result.rows, result];
    });
}

/**
 * Wraps operation with transaction operators: BEGIN and COMMIT/ROLLBACK
 * @param {Function} operation Operation to perform. Established connection is passed as an argument
 * @returns {TransactionWrapper} Wrapped operation to pass to query functions
 */
function wrapWithTransaction (operation) {
    return new TransactionWrapper(operation);
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
    query: performPooledQuery,
    /**
     * Wraps operation with transaction operators: BEGIN on success and COMMIT/ROLLBACK on failure
     * @param {Function} operation Operation to perform. Established connection is passed as an argument
     * @returns {TransactionWrapper} Wrapped operation to pass to query functions
     */
    transaction: wrapWithTransaction
};