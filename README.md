# Q-wrapped-pg

A [Q-promise](https://github.com/kriskowal/q) [node-postgres](https://github.com/brianc/node-postgres) module wrapper.
It will run your function, giving a ready-to-use `Client` instance using the `Q-promise` pipeline.
Both pooled and non-pooled requests are supported - both provided through unified interface which may make switching
from one to another a bit easier.

## Installation

```
npm install q-wrapped-pg
```
Note: The module is using `peerDependencies` to require `Q` and `pg`, so your project may have its own
dependencies on both libraries installed.

## Usage

Two methods are available:
* `pooled` - use to request a database `Client` from a node-postgres client pool
* `nonPooled` - creates a new node-postgres `Client` instance.

Either function is expecting two or more parameters:
* `connection options` - string or object according to [node-postgres documentation](https://github.com/brianc/node-postgres/wiki/Client#method-connect).
* `operation` - a function that is being called upon connection is established. Place your request code here.
  A `Client` instance will be passed to the function as a first parameter.
* The rest of params passed to function will be appended to `operation` call.

The wrapper will reject upon connection error or `operation` failure.

The wrapper takes care of correctly cleaning up either client by calling `done` or `client.end` internally when your
`operation` finishes as long as a `promise` is returned from it.

## Examples

Here is a slightly modified original example from [node-postgres page](https://github.com/brianc/node-postgres).

### pooled

Uses node-postgres pooling service to get a client for you. `Client` instance is passed to your function as a first
parameter. Return a promise from your `operation` and `done` callback provided to original `pg.query` callback will
be called after the `operation` promise is fulfilled or rejected.
If connection error occurs, `operation` never gets called.

```javascript
  var qpg = require("q-wrapped-pg");
  var conString = "postgres://username:password@localhost/database";

  // Take client from client pool
  qpg.pooled(
      conString,
      function(client, num) {
          // A simple query example where a callback function
          // with error management is fulfilled by Q-promise
          return Q.ninvoke(
              client,
              "query",
              {
                  text: 'SELECT $1::int AS number',
                  values: [num]
              }
          ).then(
              // Produce final result for the outside caller
              function(result) {
                  return result.rows[0].number;
              }
          );
      },
      "1" // Extra parameter
  ).then(
      function(passedParam) {
          console.log("Passed param: " + passedParam);
          // Output: Passed param: 1
      },
      function(reason) {
          console.log("Connection or query error: ");
          console.log(reason);
      }
  ).finally(
      function() {
          // Close all database connections when done
          // Original pg is exported for convenience
          qpg.pg.end();
      }
  );
```

### nonPooled

Creates a new node-postgres `Client` and connects it to database.
Your operation should follow the same guideline - accept a `Client` as a first param, use it and return a promise.
`client.end` will be called whenever your promise fulfills or rejects.
If connection error occurs, `operation` never gets called.

```javascript
  // Create new `Client` instance and use it
  qpg.nonPooled(
      conString,
      function(client) {
          // Client is an ordinary node-postgres client
          // so you may use it in any traditional way.
          // Just produce a promise as a function result
          // so the wrapper knows when you are done.
          var deferred = Q.defer();
          client.query(
              'SELECT NOW() as "theTime"',
              function(err, result) {
                  if (err) {
                      return deferred.reject(err);
                  }
                  deferred.resolve(result.rows[0].theTime);
              }
          );
          return deferred.promise;
      }
  ).done(
      function(currentDateTime) {
          console.log("Current date/time: " + currentDateTime);
          // Output: Current date/time: Fri Feb 06 2015 03:16:35 GMT+0000 (UTC)
      },
      function(reason) {
          console.log("Connection or query error: ");
          console.log(reason);
      }
  );
```

