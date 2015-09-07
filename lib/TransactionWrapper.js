"use strict";

var util = require("util");
var Q = require("q");
var OperationWrapper = require("./OperationWrapper");

/**
 * TransactionWrapper
 * Wraps passed operation to transaction
 * - Calls BEGIN before passing control to operation
 * - Calls COMMIT when operation succeeds (fulfills the promise)
 * - Calls ROLLBACK if operation fails (rejects the promise)
 *
 * @param {Function} operation Operation to perform. Established connection is passed as an argument
 * @constructor
 */
function TransactionWrapper (operation) {
    OperationWrapper.call(this, operation);
}
util.inherits(TransactionWrapper, OperationWrapper);

/**
 * Wraps passed operation into transaction statements
 * @param {Function} operation Function to check
 * @returns {Function} A promised operation
 * @protected
 */
TransactionWrapper.prototype._wrapOperation = function(operation) {
    var promised = OperationWrapper.prototype._wrapOperation.call(this, operation);
    return function (client) {
        var query = Q.nbind(client.query, client);
        var args = arguments;
        return query("BEGIN").then(function() {
            return promised.apply(void 0, args);
        }).then(
            function(result){
                return query("COMMIT").thenResolve(result);
            },
            function(reason){
                return query("ROLLBACK").thenReject(reason);
            }
        );
    }
};

module.exports = TransactionWrapper;