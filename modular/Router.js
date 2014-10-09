/*jslint node:true*/
"use strict";
/**
 *
 * @constructor
 */
function Router() {
    this._routes = [];
}
/**
 * add a route to routes
 * @param {Route} route
 * @returns {Route}
 */
Router.prototype.addRoute = function (route) {
    this._routes.push(route);
    return route;
};
/**
 *
 * @returns {Array.<Route>}
 */
Router.prototype.getRoutes = function () {
    return this._routes;
};
/*
 * @param {Number} i
 * @returns {Route}
 */
Router.prototype.routeAt = function (i) {
    return this._routes[i];
};
/**
 *
 * @param url
 * @param method
 * @returns {Route}
 */
Router.prototype.match = function (url, method) {
    var i, matchedRouted;
    method = (method || "GET").toUpperCase();
    for (i = 0; i < this.getRoutes().length; i += 1) {
        if (url.match(this.routeAt(i).regexp()) && (method.match(this.routeAt(i).method()) || this.routeAt(i).method() === false)) {
            matchedRouted = this.routeAt(i);
            break;
        }
    }
    return matchedRouted;
};

/**
 *
 * @param {String} url
 * @param callback
 * @returns {Route}
 */
Router.prototype.all = function (url, callback) {
    var route = new Router.Route();
    route.url(url).callback(callback);
    this.addRoute(route);
    return route;
};
/* for each HTTP method , add a method handler */
['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].forEach(function (method) {
    Router.prototype[method] = function (url, callback) {
        var route = this.all(url, callback);
        route.method(method.toUpperCase());
        return route;
    };
});

Router.Route = require('./Route');

module.exports = Router;