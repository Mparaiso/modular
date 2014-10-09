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
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
    function handler(req, res) {
        handler.server = this;
        handler.emit(Application.event.SERVER_REQUEST, req, res, handler);
    }

    /** configure the injector */
    injector
        .value('$injector', injector)
        .service('$application', function () {
            return handler;
        }).service('$q', function () {
            return q;
        })
        .service('$emitter', function () {
            return emitter;
        });
    /** expose router methods */
    ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].forEach(function (method) {
        handler[method] = router[method].bind(router);
    });
    handler.router = router;
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
            //handler[method] = emitter[method].bind(emitter);
            handler[method] = emitter[method].bind(emitter);
        });
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
Application.serverRequestListener = function serverRequestListener(req, res, handler) {
    var injectorClone, args, callbacks, finish,
        match, output, urlObject = url.parse(req.url, true),
        $q = handler.inject('$q'),chain = $q.when(true);
    res.on('close', function () {
        handler.emit(Application.event.SERVER_RESPONSE_CLOSE, this, handler);
    }).on('finish', function () {
        handler.emit(Application.event.SERVER_RESPONSE_FINISH, this, handler);
    });
    handler.emit(Application.event.APPLICATION_BEFORE_REQUEST,req,res,chain,handler);
    match = handler.router.match(urlObject.pathname, req.method);
    if (match) {
        /* create a local injector so request and reponses objects are scoped */
        injectorClone = handler.injector.clone();
        injectorClone.value('$request', req)
            .value('$response', res)
            .value('$url', urlObject)
            .value('$routeParams', match.paramsFromUrl(urlObject.pathname) || {})
            .value('$query', urlObject.query || {});
        callbacks = match.getAllCallbacks();
        if (match.finish.length > 0) {
            res.on('close', function () {
                match.finish().slice().reduce(function (chain, callback, array) {
                    return chain.then(function () {
                        return callback.apply(this, injectorClone.getFunctionArgValues(callback));
                    })
                }, $q.when(true))
                    .catch(function (err) {
                        handler.emit(Application.event.APPLICATION_ERROR, req, res, err, handler);
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
                        res.end($output);
                        break;
                    default:
                        res.end();
                }
            })
            .catch(function (err) {
                console.log(Application.event.APPLICATION_RESPONSE_ERROR, err);
                handler.emit(Application.event.APPLICATION_RESPONSE_ERROR, req, res, err.stack, handler);
            })
            .done();
    } else {
        res.statusCode = 404;
        res.end(req.url + ' Not Found');
    }
};
Application.responseErrorListener = function (req, res, error, handler) {
    res.statusCode = 500;
    res.end(error);
};
module.exports = Application;

