"use strict";

// var Core = require("lapis-core");
var Data = require("lapis-data");
var Https = require("https");


var manager = Data.Manager.clone({
    id: "Manager",
    instance: true,
    server_http_options: {
        hostname: "localhost",
        port: 8443,
        path: "/serve_request",
        method: "GET",
    },
});


function startHttpServer() {
    var s = Https.createServer(function (req, resp) {
        console.log(req);
    });
    s.listen(8443);
}


module.exports.basic_request = function (test) {
    var request;

    test.expect(9);
    startHttpServer();

    test.ok(manager.new_records.length === 0, "manager object initialized okay - new_records array");
    test.ok(Object.keys(manager.curr_records).length === 0, "manager object initialized okay - curr_records array");
    test.ok(manager.isValid(), "manager object is initially valid");
    request = manager.getRequest({
        entity_id: "List",
        key: "sy.active",
    });
    test.ok(request.status === "D", "request status is initially 'D' (defining)");
    test.ok(request.criteria.length === 1, "request has one criterion");
    request.execute()
    .then(function () {
        console.log("test in promise resolve");
        test.ok(request.status === "C", "request status is now 'C' (completed)");
    })
    .then(null, function (error) {
        console.log("test in promise reject");
        test.ok(false, error);
        // test.ok(, "");
        // test.ok(, "");
        // test.ok(, "");
        // test.ok(, "");
    })
    .then(function () {
        console.log("test in promise resolve");
        test.done();
    });

    console.log("test before promise");
    test.ok(request.status === "R", "request status is now 'R' (requesting)");
};
