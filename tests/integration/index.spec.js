/*jslint node:true*/
/*global describe,afterEach,beforeEach,it,expect*/
"use strict";
var Application = require('../../index');
describe('index', function () {
    beforeEach(function () {
        this.app = new Application();
        this.request = require('supertest');
    });
    describe('GET /', function () {
        beforeEach(function () {
            this.app.get('/', function () {
                return 'Index,status code should be 250';
            }).before(function ($response) {
                $response.statusCode = 250;
            });
        });
        it('status should be 250', function (done) {
            this.request(this.app)
                .get('/')
                .expect(300, done);
        });
    });
    describe('GET /error', function () {
        beforeEach(function () {
            this.app.get('/error', function () {
                this.syntaxError();
            });
        });
        it('status should be 500', function (done) {
            this.request(this.app)
                .get('/error')
                .expect(500).end(done);
        });
    });
    describe("GET /^\/regexp\/(\\w+)\/(\\w+)$/r", function () {
        beforeEach(function () {
            this.app.get(/^\/regexp\/(\w+)\/(\w+)$/, function ($routeParams) {
                return JSON.stringify($routeParams);
            });
        });
        it('status should be 200', function (done) {
            this.request(this.app)
                .get('/regexp/foo/bar')
                .expect(200, "[\"foo\",\"bar\"]", done);
        });
    });
    describe('GET /range/:from-:to', function () {
        beforeEach(function () {
            this.app.get('/range/:from-:to', function ($routeParams) {
                return 'from ' + $routeParams.from + ' to ' + $routeParams.to;
            });
        });
        it('status should be 200', function (done) {
            this.request(this.app)
                .get('/range/10/1000')
                .expect(200, 'from 10 to 1000', done);
        });
    });
    describe('GET /query', function () {
        beforeEach(function () {
            this.app.get('/query', function ($query, $response) {
                $response.setHeader("Content-Type", "application/json");
                $response.end(JSON.stringify($query, null, "\t"));
            });
        });
        it('should be status 200', function (done) {
            this.request(this.app)
                .get('/query?foo=bar&baz=biz')
                .expect(200, JSON.stringify({foo: "bar", baz: "biz"}), done);
        });
    });
});