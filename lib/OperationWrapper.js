"use strict";

var Q = require("q");

/**
 * OperationWrapper
 * Wraps passed operation and prepares its execution
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
 * Checks passed operation
 * @param {Function} operation Function to check
 * @returns {Function} A promised operation
 * @protected
 */
OperationWrapper.prototype._wrapOperation = function(operation) {
    return Q.promised(operation);
};

module.exports = OperationWrapper;