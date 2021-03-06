/**
 * db/Connection test
 * User: motorro
 * Date: 03.02.2015
 * Time: 7:28
 */
"use strict";

var proxyquire =  require('proxyquire').noCallThru();
var pgStub = require('./support/pgStub');

var Connection = proxyquire('../index.js', { "pg": pgStub });
var isCommand = require("../lib/OperationWrapper").isCommand;

/**
 * Both functions (pooled, nonPooled) should perform the same for the outside world
 * So the same test suite should work for both functions
 * @param fn
 * @param description
 */
function test(fn, description) {
    describe (description, function() {
        it ("should return promise", function(){
            var result = fn("connection string", function() {});
            expect(Q.isPromise(result)).to.be.true;
        });
        it ("should call operation if connected successfully", function(done){
            var operation = sinon.spy();
            fn("connection string", operation).done(
                function() {
                    operation.should.have.been.calledOnce;
                    done();
                },
                function(err) {
                    done(err);
                }
            );
        });
        it ("should support using pg.defaults", function(done){
            var operation = function(c) {
                expect(c.config).to.be.null;
                return Q();
            };
            fn(operation).done(
                function() {
                    done();
                },
                function(err) {
                    done(err);
                }
            );
        });
        it ("should pass pg client as a first arg", function(done){
            var operation = sinon.spy();
            fn("connection string", operation).done(
                function() {
                    var call = operation.getCall(0);
                    call.args.should.have.length(1);
                    call.args[0].should.be.an.instanceof(pgStub.Client);
                    done();
                },
                function(err) {
                    done(err);
                }
            );
        });
        it ("should pass additional args to operation", function(done){
            var operation = sinon.spy();
            fn("connection string", operation, 1, 2, 3).done(
                function() {
                    var call = operation.getCall(0);
                    call.args.should.have.length(4);
                    call.args.slice(1).should.deep.equal([1, 2, 3]);
                    done();
                },
                function(err) {
                    done(err);
                }
            );
        });
        it ("should resolve with operation return value on success", function(){
            return fn("connection string", function() { return "ok"; }).should.eventually.equal("ok");
        });
        it ("should cleanup client after operation has complete", function(done){
            var end = null;
            var client = null;
            var operation = function(c) {
                var d = Q.defer();
                client = c;
                end = sinon.spy(client, "end");
                client.destroyed.should.be.false;
                process.nextTick(function() {
                    d.resolve();
                });
                return d.promise;
            };
            fn("connection string", operation).done(
                function() {
                    end.should.have.been.calledOnce;
                    client.destroyed.should.be.true;
                    done();
                },
                function(err) {
                    done(err);
                }
            );
        });
        describe ("if connection fails", function() {
            var options = null;
            before("Set-up connection that fails", function() {
                options = {
                    connectionError: "connection"
                };
            });

            it("should fail", function(){
                return fn(options, function() { }).should.eventually.be.rejectedWith(options.connectionError);
            });
            it("should not perform operation", function(done){
                var operation = sinon.spy();
                fn(options, operation).done(
                    function() {
                        done("should not succeed");
                    },
                    function(err) {
                        operation.should.not.have.been.calledOnce;
                        done();
                    }
                )
            });
        });
        describe ("if operation fails", function() {
            var operation = null;
            before("Set-up operation that fails", function() {
                operation = function() {
                    return Q.reject("operation");
                }
            });

            it("should fail", function(){
                return fn("connection string", operation).should.eventually.be.rejectedWith("operation");
            });
            it ("should cleanup client after operation has failed", function(done){
                var end = null;
                var client = null;
                operation = function(c) {
                    var d = Q.defer();
                    client = c;
                    end = sinon.spy(client, "end");
                    client.destroyed.should.be.false;
                    process.nextTick(function() {
                        d.reject("operation");
                    });
                    return d.promise;
                };
                fn("connection string", operation).done(
                    function() {
                        done("should not succeed");
                    },
                    function(err) {
                        end.should.have.been.calledOnce;
                        client.destroyed.should.be.true;
                        done();
                    }
                );
            });
        });
    });
}

describe ("DB Connection", function() {
    beforeEach(function() {
        pgStub.defaults = null;
    });
    test (
        function() {
            return Connection.pooled.apply(Connection, arguments);
        },
        "pooled"
    );
    test (
        function() {
            return Connection.nonPooled.apply(Connection, arguments);
        },
        "non-pooled"
    );
});

describe ("Commands", function(){
    beforeEach(function() {
        pgStub.defaults = null;
    });

   it ("should be accepted and executed", function(){
       var paramValue = "some value";
       var SomeCommand = function() {
           this.execute = function(client, param) {
               client.should.be.instanceOf(pgStub.Client);
               param.should.equal(paramValue);
               return Q(param);
           }
       };
       return Connection.pooled("connection string", new SomeCommand(), paramValue).should.eventually.equal(paramValue);
   });
});

describe ("Transaction", function() {
    beforeEach(function() {
        pgStub.defaults = null;
    });

    function applyTransaction(args) {
        var transactionAt = "function" === typeof args[0] ? 0 : 1;
        args[transactionAt] = Connection.transaction(args[transactionAt]);
        return args;
    }

    test (
        function() {
            return Connection.pooled.apply(Connection, applyTransaction(arguments));
        },
        "transaction on pooled"
    );
    test (
        function() {
            return Connection.nonPooled.apply(Connection, applyTransaction(arguments));
        },
        "transaction on non-pooled"
    );

});

describe ("Query", function() {
    beforeEach(function() {
        pgStub.defaults = null;
    });
    it ("should pass SQL to PG-Client and return result", function(){
        var sql = "SELECT NOW() as t";
        var expectedDateTime = "2015-08-12 07:00:07.204506+00";
        pgStub.defaults = {
            queryValidator: function (query) {
                query.should.equal(sql);
                return {
                    result: {
                        rows: [{
                            t: expectedDateTime
                        }]
                    }
                };
            }
        };
        return Connection.query(sql).should.eventually.deep.equal(
            [
                [{
                    t: expectedDateTime
                }],
                {
                    rows: [{
                        t: expectedDateTime
                    }]
                }
            ]
        );
    });
    it ("should pass params to PG-Client", function(){
        var sql = "SELECT $1::text as name";
        var params = ["motorro"];
        pgStub.defaults = {
            queryValidator: function (query, vars) {
                query.should.equal(sql);
                vars.should.deep.equal(params);
                return {
                    result: {
                        rows: [{
                            name: "motorro"
                        }]
                    }
                };
            }
        };
        return Connection.query(sql, params).should.eventually.deep.equal(
            [
                [{
                    name: params[0]
                }],
                {
                    rows: [{
                        name: params[0]
                    }]
                }
            ]
        );
    });
});

describe ("setPg", function(){
    beforeEach(function() {
        pgStub.defaults = null;
    });
    it ('should use imported pg by default', function() {
        pgStub.defaults = {
            queryValidator: function () {
                return {
                    result: {
                        rows: [{
                            source: "import"
                        }]
                    }
                };
            }
        };
        return Connection.query().should.eventually.deep.equal(
            [
                [{
                    source: "import"
                }],
                {
                    rows: [{
                        source: "import"
                    }]
                }
            ]
        );
    });
    it ('should should switch to set pg', function() {
        pgStub.defaults = {
            queryValidator: function () {
                return {
                    result: {
                        rows: [{
                            source: "import"
                        }]
                    }
                };
            }
        };

        var newPg = (function(inst){
            var result = {};
            Object.keys(inst).forEach(function(key){
                result[key] = inst[key];
            });
            return result;
        })(pgStub);

        newPg.defaults = {
            queryValidator: function () {
                return {
                    result: {
                        rows: [{
                            source: "explicitlySet"
                        }]
                    }
                };
            }
        };

        newPg.should.not.be.equal(pgStub);
        newPg.defaults.should.not.be.equal(pgStub.defaults);

        Connection.setPg(newPg);
        return Connection.query().should.eventually.deep.equal(
            [
                [{
                    source: "explicitlySet"
                }],
                {
                    rows: [{
                        source: "explicitlySet"
                    }]
                }
            ]
        );
    });
});
