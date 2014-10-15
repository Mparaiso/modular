/*jslint node:true */

"use strict";

var events = require('events'),
    q = require('q'),
    url = require('url');

/**
 *
 * @returns {Function} return a server handler
 * @constructor
 */
function Application() {
    var router = new Application.Router(),
        injector = new Application.Injector(),
        emitter = new events.EventEmitter();

    /**
     * server request handler
     * @type requestListener
     * @param {http.IncomingMessage} request
     * @param {http.ServerResponse} response
     */
    function handler(request, response) {
        handler.emit(Application.event.SERVER_REQUEST, {
            request: request,
            response: response,
            server: this,
            application: handler
        });
    }

    /** configure the injector */
    injector
        .value('$router', router)
        .value('$injector', injector)
        .value('$emitter', emitter)
        .service('$application', function () {
            return handler;
        }).service('$q', function () {
            return q;
        });
    /** expose router methods */
    ['post', 'put', 'delete', 'patch', 'head', 'options'].forEach(function (method) {
        handler[method] = function () {
            var $router = handler.injector.get('$router');
            return $router[method].apply($router, [].slice.call(arguments));
        }
    });
    /** expose injector methods */
    ['service', 'value', 'inject'].forEach(function (method) {
        handler[method] = injector[method].bind(injector);
    });
    handler.injector = injector;
    /** expose emitter methods */
    ['addListener',
        'on',
        'once',
        'removeListener',
        'removeAllListeners',
        'setMaxListeners',
        'listeners',
        'emit'].forEach(function (method) {
            handler[method] = function () {
                var $emitter = handler.injector.get('$emitter');
                return $emitter[method].apply($emitter, [].slice.call(arguments));
            };
        });
    /** depending on the number of arguments,either call injector.get or router.get */
    handler.get = function get() {
        if (arguments.length <= 1) {
            return this.injector.get.apply(this.injector, [].slice.call(arguments));
        }
        var $router = this.injector.get('$router');
        return $router.get.apply($router, [].slice.call(arguments));
    }
    handler.dispose = function () {
        handler.removeAllListeners();
    };
    /** register server events **/
    handler.on(Application.event.SERVER_REQUEST, Application.serverRequestListener);
    handler.on(Application.event.APPLICATION_RESPONSE_ERROR, Application.responseErrorListener);
    return handler;

}


Application.Router = require('./Router');
Application.Injector = require('./Injector');
Application.event = {
    SERVER_RESPONSE_CLOSE: 'SERVER_RESPONSE_CLOSE',
    SERVER_RESPONSE_FINISH: 'SERVER_RESPONSE_FINISH',
    SERVER_REQUEST_START: 'SERVER_REQUEST_START',
    APPLICATION_RESPONSE_ERROR: 'APPLICATION_RESPONSE_ERROR',
    APPLICATION_ERROR: 'APPLICATION_ERROR',
    APPLICATION_BEFORE_REQUEST: 'APPLICATION_BEFORE_REQUEST',
    APPLICATION_AFTER_REQUEST: 'APPLICATION_AFTER_REQUEST',
    SERVER_REQUEST: 'SERVER_REQUEST',
    APPLICATION_REQUEST_FINISH: 'APPLICATION_REQUEST_FINISH',
}
Application.serverRequestListener = function serverRequestListener(event) {
    var injectorClone, args, callbacks, finish,
        match, output,
        request = event.request,
        response = event.response,
        application = event.application,
        urlObject = url.parse(request.url, true),
        injectorClone = application.injector.clone(),
        $q = application.inject('$q'),
        chain = $q.when(true);
    response.on('close', function () {
        application.emit(Application.event.SERVER_RESPONSE_CLOSE, {
            response: response,
            request: request,
            application: application
        });
    });
    response.on('finish', function () {
        application.emit(Application.event.SERVER_RESPONSE_FINISH, {
            response: response,
            request: request,
            application: application
        });
    });
    application.emit(Application.event.APPLICATION_BEFORE_REQUEST, {
        request: request,
        response: response,
        chain: chain,
        application: application
    });
    match = application.get('$router').match(urlObject.pathname, request.method);
    if (match) {
        /* create a local injector so request and reponses objects are scoped */
        injectorClone.value('$request', request)
            .value('$response', response)
            .value('$url', urlObject)
            .value('$routeParams', match.paramsFromUrl(urlObject.pathname) || {})
            .value('$query', urlObject.query || {});
        callbacks = match.getAllCallbacks();
        /** set finish callback */
        if (match.finish.length > 0) {
            application.on(Application.event.SERVER_RESPONSE_FINISH, function (event) {
                match.finish().slice().reduce(function (chain, callback, array) {
                    return chain.then(function () {
                        return callback.apply(this, injectorClone.getFunctionArgValues(callback));
                    })
                }, $q.when(true))
                    .catch(function (err) {
                        application.emit(Application.event.APPLICATION_ERROR, {
                            request: request,
                            response: response,
                            error: error,
                            application: application
                        });
                    });
            })
        }
        callbacks.reduce(function (chain, callback, array) {
            return chain.then(function ($output) {
                injectorClone.service('$output', function () {
                    return $output;
                });
                return callback.apply(this, injectorClone.getFunctionArgValues(callback));
            });
        }, chain)
            .then(function ($output) {
                switch (true) {
                    case typeof $output === "string":
                        response.end($output);
                        break;
                }
            })
            .catch(function (err) {
                application.emit(Application.event.APPLICATION_RESPONSE_ERROR, {
                    request: request,
                    response: response,
                    error: err.stack,
                    application: application
                });
            })
            .finally(function () {
                if (false == response.complete) {
                    response.end();
                }
            });
    } else {
        response.statusCode = 404;
        response.end(request.url + ' Not Found');
    }
};
Application.responseErrorListener = function (event) {
    event.response.statusCode = 500;
    event.response.end(event.error);
};
module.exports = Application;

