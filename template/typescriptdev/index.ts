// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import * as bodyParser from 'body-parser'
import * as express from 'express'
import expressWs, {Application} from 'express-ws'
import {Request, Response, Query} from 'express-serve-static-core'
import handler from './function/handler'
import {IncomingHttpHeaders} from 'http'

type Cb = (err: Error | undefined, functionResult?: any) => Response
interface IFunctionContext {
    value: number;
    cb: Cb;
    headerValues: {};
    cbCalled: number;
    headers: (value?: string) => any;
    status: (value?: number) => any;
    succeed: (value: any) => void;
    fail: (value: Error) => void;
}

const app: Application = expressWs(express.default(), undefined, {wsOptions: {clientTracking: true}}).app


if (process.env.RAW_BODY === 'true') {
    app.use(bodyParser.raw({ type: '*/*' }))
} else {
    const jsonLimit = process.env.MAX_JSON_SIZE || '100kb' //body-parser default
    app.use(bodyParser.json({ limit: jsonLimit}));
    app.use(bodyParser.raw()); // "Content-Type: application/octet-stream"
    app.use(bodyParser.text({ type : "text/*" }));
}

app.disable('x-powered-by');

class FunctionEvent {
    body: any
    headers: IncomingHttpHeaders
    method: string
    query: Query
    path: string

    constructor(req: Request) {
        this.body = req.body;
        this.headers = req.headers;
        this.method = req.method;
        this.query = req.query;
        this.path = req.path;
    }
}


class FunctionContext {
    value: number;
    cb: Cb;
    headerValues: {};
    cbCalled: number;

    constructor(cb: Cb) {
        this.value = 200;
        this.cb = cb;
        this.headerValues = {};
        this.cbCalled = 0;
    }

    status(value?: number) {
        if(!value) {
            return this.value;
        }
        this.value = value;
        return this;
    }

    headers(value?: string) {
        if(!value) {
            return this.headerValues;
        }
        this.headerValues = value;
        return this;
    }

    succeed(value: any) {
        let err: undefined;
        this.cbCalled++;
        this.cb(err, value);
    }

    fail(value: Error) {
        this.cbCalled++;
        this.cb(value);
    }
}

const middleware = async (req: Request, res: Response) => {
    const cb: Cb = (err, functionResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send(err.toString ? err.toString() : err);
        }

        if(isArray(functionResult) || isObject(functionResult)) {
            return res.set(fnContext.headers()).status(<number>fnContext.status()).send(JSON.stringify(functionResult));
        } else {
            return res.set(fnContext.headers()).status(<number>fnContext.status()).send(functionResult);
        }
    };

    const fnEvent = new FunctionEvent(req);
    const fnContext: IFunctionContext = new FunctionContext(cb);

    Promise.resolve(handler(fnEvent, fnContext, cb))
      .then(res => {
          if(!fnContext.cbCalled) {
              fnContext.succeed(res);
          }
      })
      .catch(e => {
          cb(e);
      });
};

app.post('/*', middleware);
app.get('/*', middleware);
app.patch('/*', middleware);
app.put('/*', middleware);
app.delete('/*', middleware);
// app.ws('/*', middleware);

const port = process.env.http_port || 3000;

app.listen(port, () => {
    console.log(`OpenFaaS Node.js listening on port: ${port}`)
});

const isArray = (a: { constructor: ArrayConstructor }) => {
    return (!!a) && (a.constructor === Array);
};

const isObject = (a: { constructor: ObjectConstructor }) => {
    return (!!a) && (a.constructor === Object);
};