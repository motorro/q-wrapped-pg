"use strict";

var Q = require("q");

/**
 * OperationWrapper
 * Wraps passed operation to a command-pattern and prepares its execution
 *
 * @param {Function} operation Operation to perform. Established connection is passed as an argument
 * @constructor
 */
function OperationWrapper (operation) {
    /**
     * Command pattern execute method
     * Runs wrapped operation
     * @param {pg.Client|Q.promise} client Connected PG-client or a promise for it
     * @returns {Q.promise}
     */
    this.execute = this._wrapOperation(operation);
}

/**
 * Checks if passed operation is a a command (has execute method)
 * @param {Function|Object} operation Operation to check
 * @returns {boolean}
 * @static
 */
OperationWrapper.isCommand = function(operation) {
    return null != operation && "object" === typeof operation && "function" === typeof operation.execute;
};

/**
 * Checks passed operation
 * @param {Function|OperationWrapper} operation Function to check
 * @returns {Function} A promised operation
 * @protected
 */
OperationWrapper.prototype._wrapOperation = function(operation) {
    return OperationWrapper.isCommand(operation) ? function() { return operation.execute.apply(operation, arguments); }
                                                 : Q.promised(operation);
};

module.exports = OperationWrapper;