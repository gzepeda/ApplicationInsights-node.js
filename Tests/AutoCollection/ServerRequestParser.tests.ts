///<reference path="..\..\typings\globals\node\index.d.ts" />
///<reference path="..\..\typings\globals\mocha\index.d.ts" />
///<reference path="..\..\typings\globals\sinon\index.d.ts" />


import assert = require("assert");
import sinon = require("sinon");

import ServerRequestParser = require("../../AutoCollection/ServerRequestParser");

describe("AutoCollection/ServerRequestParser", () => {

    describe("#parseId()", () => {
        it("should extract guid out of cookie", () => {
            var cookieValue = "id|1234|1234";
            var actual = ServerRequestParser.parseId(cookieValue);
            assert.equal("id", actual, "id in cookie is parsed correctly");
        });
    });

    describe("#getRequestData()", () => {
        var request = {
            method: "GET",
            url: "/search?q=test",
            connection: {
                encrypted: false
            },
            headers: {
                host: "bing.com"
            }
        }

        it("should return an absolute url", () => {
            var helper = new ServerRequestParser(<any>request);
            var requestData = helper.getRequestData();
            assert.equal(requestData.baseData.url, "http://bing.com/search?q=test");
        });

        it("should return an absolute url for encrypted traffic", () => {
            request.connection.encrypted = true;

            var helper = new ServerRequestParser(<any>request);
            var requestData = helper.getRequestData();
            assert.equal(requestData.baseData.url, "https://bing.com/search?q=test");
        });

        var requestComplex = {
            method: "GET",
            url: "/a/b/c/?q=test&test2",
            connection: {
                encrypted: false
            },
            headers: {
                host: "bing.com"
            }
        }

        it("should return an absolute url for complex urls", () => {
            var helper = new ServerRequestParser(<any>requestComplex);
            var requestData = helper.getRequestData();
            assert.equal(requestData.baseData.url, "http://bing.com/a/b/c/?q=test&test2");
        });

        var requestNoSearchParam = {
            method: "method",
            url: "/a/",
            connection: {
                encrypted: false
            },
            headers: {
                host: "bing.com"
            }
        }

        it("should return an absolute url when url does not have search part", () => {
            var helper = new ServerRequestParser(<any>requestNoSearchParam);
            var requestData = helper.getRequestData();
            assert.equal(requestData.baseData.url, "http://bing.com/a/");
        });

        var requestNoPathName = {
            method: "method",
            url: "/",
            connection: {
                encrypted: false
            },
            headers: {
                host: "bing.com"
            }
        }

        it("should return an absolute url when url does not have path name", () => {
            var helper = new ServerRequestParser(<any>requestNoPathName);
            var requestData = helper.getRequestData();
            assert.equal(requestData.baseData.url, "http://bing.com/");
        });
    });

    describe("#getRequestTags()", () => {

        var request = {
            method: "GET",
            url: "/search?q=test",
            connection: {
                encrypted: false
            },
            headers: {
                host: "bing.com",
                "x-forwarded-for": "123.123.123.123",
                "cookie": "ai_user=cookieUser|time;ai_session=cookieSession|time",
                "x-ms-request-id": "parentRequestId",
                "x-ms-request-root-id": "operationId",
            }
        }

        it("should not override context tags if they are already set", () => {
            var helper = new ServerRequestParser(<any>request);

            var originalTags: {[key: string]:string} = {
                [(<any>ServerRequestParser).keys.locationIp]: 'originalIp',
                [(<any>ServerRequestParser).keys.userId]: 'originalUserId',
                [(<any>ServerRequestParser).keys.userAgent]: 'originalUserAgent',
                [(<any>ServerRequestParser).keys.operationName]: 'originalOperationName',
                [(<any>ServerRequestParser).keys.operationId]: 'originalOperationId',
                [(<any>ServerRequestParser).keys.operationParentId]: 'originalOperationParentId'
            };
            var newTags = helper.getRequestTags(originalTags);
            assert.equal(newTags[(<any>ServerRequestParser).keys.locationIp], 'originalIp');
            assert.equal(newTags[(<any>ServerRequestParser).keys.userId], 'originalUserId');
            assert.equal(newTags[(<any>ServerRequestParser).keys.userAgent], 'originalUserAgent');
            assert.equal(newTags[(<any>ServerRequestParser).keys.operationName], 'originalOperationName');
            assert.equal(newTags[(<any>ServerRequestParser).keys.operationId], 'originalOperationId');
            assert.equal(newTags[(<any>ServerRequestParser).keys.operationParentId], 'originalOperationParentId');
        });

        it("should read tags from headers", () => {
            var helper = new ServerRequestParser(<any>request);

            var originalTags: {[key: string]:string} = {
            };

            var newTags = helper.getRequestTags(originalTags);
            assert.equal(newTags[(<any>ServerRequestParser).keys.locationIp], '123.123.123.123');
            assert.equal(newTags[(<any>ServerRequestParser).keys.userId], 'cookieUser');
            assert.equal(newTags[(<any>ServerRequestParser).keys.userAgent], undefined);
            assert.equal(newTags[(<any>ServerRequestParser).keys.operationName], 'GET /search');
            assert.equal(newTags[(<any>ServerRequestParser).keys.operationId], 'operationId');
            assert.equal(newTags[(<any>ServerRequestParser).keys.operationParentId], 'parentRequestId');
        });
    });
});