/**
 * Common test environment
 * User: motorro
 * Date: 15.01.2015
 * Time: 8:08
 */
"use strict";

var chai = require("chai");

var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
global.chaiAsPromised = chaiAsPromised;

var sinon = require("sinon");
global.sinon = sinon;
var sinonChai = require("sinon-chai");
chai.use(sinonChai);

global.expect = chai.expect;
global.should = chai.should();
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;