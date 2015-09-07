/**
 * TransactionWraper.spec.js
 * User: motorro
 * Date: 06.09.2015
 * Time: 15:38
 */
"use strict";

var TransactionWrapper = require("../lib/TransactionWrapper");

describe ("TransactionWrapper", function() {
    var operation = null;
    var wrapper = null;

    beforeEach(function(){
        operation = sinon.spy(function(){ return Q(); });
        wrapper = new TransactionWrapper(operation);
    });

    it ("should be a command", function() {
        wrapper.should.respondTo("execute");
    });
    it ("should return a promise when 'execute' called", function() {
        var client = {
            query: function(sql, callback) { callback(); }
        };
        Q.isPromise(wrapper.execute(client)).should.be.true;
    });
    it ("should call passed operation when execute called", function() {
        var client = {
            query: function(sql, callback) { callback(); }
        };
        return wrapper.execute(client, 1, 2, 3).then(function(){
            var call = operation.getCall(0);
            call.args.should.have.length(4);
            call.args[0].should.equal(client);
        });
    });
    it ("should call 'begin' before operation executes", function() {
        var client = {
            query: function(sql, callback) { callback(); }
        };
        var querySpy = sinon.spy(client, "query");
        var operation = function() {
            querySpy.should.have.been.calledOnce;
            var call = querySpy.getCall(0);
            call.args[0].should.equal("BEGIN");
            return Q();
        };
        wrapper = new TransactionWrapper(operation);
        return wrapper.execute(client);
    });
    it ("should call 'commit' if operation succeeds", function() {
        var client = {
            query: function(sql, callback) { callback(); }
        };
        var querySpy = sinon.spy(client, "query");
        return wrapper.execute(client).then(function(){
            querySpy.should.have.been.calledTwice;
            var call = querySpy.getCall(1);
            call.args[0].should.equal("COMMIT");
        });
    });
    it ("should call 'rollback' if operation fails", function() {
        var reason = "some error";
        var client = {
            query: function(sql, callback) { callback(); }
        };
        var querySpy = sinon.spy(client, "query");
        var operation = function() {
            return Q.reject(reason);
        };
        wrapper = new TransactionWrapper(operation);
        return wrapper.execute(client).then(
            Q.reject,
            function(){
                querySpy.should.have.been.calledTwice;
                var call = querySpy.getCall(1);
                call.args[0].should.equal("ROLLBACK");
            }
        );
    });
    it ("should resolve with operation result on success", function() {
        var result = "some result";
        var client = {
            query: function(sql, callback) { callback(); }
        };
        var querySpy = sinon.spy(client, "query");
        var operation = function() {
            return Q(result);
        };
        wrapper = new TransactionWrapper(operation);
        return wrapper.execute(client).then(
            function(opResult){
                opResult.should.equal(result);
            }
        );
    });
    it ("should reject with operation reason on operation failure", function() {
        var reason = "some reason";
        var client = {
            query: function(sql, callback) { callback(); }
        };
        var querySpy = sinon.spy(client, "query");
        var operation = function() {
            return Q.reject(reason);
        };
        wrapper = new TransactionWrapper(operation);
        return wrapper.execute(client).then(
            Q.reject,
            function(opReason){
                opReason.should.equal(reason);
            }
        );
    });
});