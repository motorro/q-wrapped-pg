/**
 * TransactionWraper.spec.js
 * User: motorro
 * Date: 06.09.2015
 * Time: 15:38
 */
"use strict";

var Q = require("q");
var OperationWrapper = require("../lib/OperationWrapper");

describe ("OperationWrapper", function() {
    var operation = null;
    var wrapper = null;
    beforeEach(function(){
        operation = sinon.spy(function(){ return Q(); });
        wrapper = new OperationWrapper(operation);
    });

    it ("should be a command", function() {
        wrapper.should.respondTo("execute");
    });
    it ("should return a promise when 'execute' called", function() {
        Q.isPromise(wrapper.execute(null)).should.be.true;
    });
    it ("should call passed operation when execute called", function() {
        var client = {};
        return wrapper.execute(client, 1, 2, 3).then(function(){
            var call = operation.getCall(0);
            call.args.should.have.length(4);
            call.args[0].should.equal(client);
        });
    });
});