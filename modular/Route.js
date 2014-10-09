/*jslint node:true*/
"use strict";
/**
 * A route
 * @constructor
 */
function Route() {
    this._callback = undefined;
    this._before = [];
    this._after = [];
    this._finish = [];
}

Route.prototype.before = function (callback) {
    if (callback) {
        this._before.push(callback);
        return this;
    }
    return this._before;
};


Route.prototype.after = function (callback) {
    if (callback) {
        this._after.push(callback);
        return this;
    }
    return this._after;
};

Route.prototype.finish = function (callback) {
    if (callback) {
        this._finish.push(callback);
        return this;
    }
    return this._finish;
}

Route.prototype.callback = function (callback) {
    if (callback) {
        this._callback = callback;
        return this;
    }
    return this._callback;

};
Route.prototype.getAllCallbacks = function () {
    return [].concat(this.before()).concat([this.callback()]).concat(this.after());
}
/**
 * get/set the route url
 * @param {string} url
 * @returns {*}
 */
Route.prototype.url = function (url) {
    var parameterRegexp = /(\:\w+)/g;
    if (url) {
        this._url = url;
        if (url instanceof RegExp) {
            this._regexp = url;
        } else {
            url = url.trim().replace(/\/$/, "");
            this._params = url.match(parameterRegexp) ? url.match(parameterRegexp).map(function (param, index) {
                return {name: param.slice(1), position: index};
            }) : null;

            this._regexp = new RegExp('^' + url.replace(parameterRegexp, '([^//]+)') + '(?:\/?)$');
        }
        return this;
    }
    return this._url;
};
/**
 * get route regexp
 * @returns {RegExp}
 */
Route.prototype.regexp = function () {
    return this._regexp;
};
Route.prototype.method = function (method) {
    if (method) {
        this._method = method;
        return this;
    }
    return this._method;
};
/**
 * Bind a route to a name
 * @param name
 * @returns {Route|string}
 */
Route.prototype.name = function (name) {
    if (name) {
        this._name = name;
        return this;
    }
    if (!this._name && this._url && this._method) {
        this._name = this._method.toString().concat(this._url).replace(/\W+/, "_");
    }
    return this._name;
};
/**
 * get url parameter definitions
 * @returns {Array<String>|*}
 */
Route.prototype.params = function () {
    return this._params;
};

/**
 * extract params from url and map it to parameter name
 * if this._url is regexp returns an array , else returns a hash
 * @param {String} url
 * @returns {Object}
 */
Route.prototype.paramsFromUrl = function (url) {
    var values = url.match(this.regexp()).slice(1);
    if (this.url()instanceof RegExp) {
        return values;
    } else if (this.params()) {
        return this.params().sort(function (current, next) {
            return current.position - next.position;
        }).reduce(function (result, param, index) {
            result[param.name] = decodeURI(values[index]);
            return result;
        }, {});
    }
};

module.exports = Route;