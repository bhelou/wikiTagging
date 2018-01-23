'use strict';

const graphURI = 'http://marklogic.com/semantics#default-graph';

const express = require('express');
const marklogic = require('marklogic');
const connection = require('./dbsettings').connection;
const app = express();
const bodyParser = require('body-parser');
const db = marklogic.createDatabaseClient(connection);
const isUrl = require('is-url');

app.set('port', 3060);

// ============= MIDDLEWARE ================ //

// choose a view engine
app.set('view engine', 'jade');
//where views files are
app.set('views', __dirname + '/app_server' + '/views');

//from https://www.gitbook.com/book/kevinchisholm/handling-post-requests-with-express-and-node-js/details
// "The static middleware has the same effect as creating a route for each static file you want to deliver that renders a file and returns it to the client."
app.use(express.static(__dirname + '/public')); //where the public resources are

//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
  extended: true
}));

// ============= ROUTES ================ //

app.post('/', function (req, res, next) {
  // make sure a valid post request has been made
  if (!("website" in req.body && req.body.website.length > 0) || !("relation" in req.body && req.body.relation.length > 0) || !("wikiTag" in req.body && req.body.wikiTag.length > 0)) {
    let error = new Error('Invalid tag request');
    res.statusCode = 501;
    return next(error);
  }

  // check that a valid url has been entered: use https://www.npmjs.com/package/valid-url
  if (!isUrl(req.body.website)) {
    let error = new Error('Invalid website URL');
    res.statusCode = 400;
    return next(error);
  }

  let subject = '<' + req.body.wikiTag + '>';
  // let predicate = req.body.relation;
  let predicate = '<' + "http://www.w3.org/2004/02/skos/core#example" + '>';
  // let predicate = '<' + "http://one.example/predicate1" + '>';
  //label: example 
  let object = '<' + req.body.website + '>';

  // I can use a folksnomy with SKOS: "There is no theoretical objection for using SKOS in a much wider range of scenarios than the thesaurus case that originally motivated its design. Glossaries or folksonomies, for instance, may be ported to SKOS. Please bear in mind though that this might require some departure from the original knowledge structure to fit the SKOS model, or, alternatively, the creation of a specific 'profile' or extension of SKOS to fit the vocabulary at hand." (from https://www.w3.org/2001/sw/wiki/SKOS/FAQs)

  // turtle format
  let triple = subject + ' ' + predicate + ' ' + object + '.';

  // // https://docs.marklogic.com/guide/node-dev/semantics
  // db.graphs.write('http://marklogic.com/semantics#test-graph', 'text/turtle', triple).result(
  //   function (response) {
  //     res.statusCode = 201;

  //     if (response.defaultGraph) {
  //       console.log('Loaded into default graph');
  //     } else {
  //       console.log('Loaded into graph ' + response.graph);
  //     };
  //   },
  //   function (error) {
  //     res.statusCode = 400;
  //     return next(Error('error loading info to RDF store'));
  //   }
  // );

  // res.statusCode = 201;
  // db.documents.write({
  //   uri: '/doc/test.json',
  //   contentType: 'application/json',
  //   content: {
  //     url: req.body.website,
  //     relation: req.body.relation,
  //     wikiTag: req.body.wikiTag
  //   }
  // }).result(null, error => console.error(error));

  db.graphs.sparqlUpdate({
    data: 'INSERT DATA { GRAPH <' + graphURI + '> {' + triple + '}}'
  }).result(
    function (response) {
      if (response.defaultGraph) {
        console.log('Loaded into default graph');
      } else {
        console.log('Loaded into graph ' + response.graph);
      };

      res.statusCode = 201;
      // send an http reponse back (this is needed!!!)
      res.send("Success: Added a triple");
    },
    function (error) {
      res.statusCode = 400;
      return next(Error('error loading info to RDF store' + error.message));
    }
  );

});

// see what information information the browser is sending (NOTE: this is optional and not necessary)
app.get('/headers', function (req, res) {
  res.set('Content-Type', 'text/plain');
  var s = '';
  for (var name in req.headers) s += name + ': ' + req.headers[name] + '\n';
  res.send(s);
});

// error middleware; for list of error codes, see List 9-1 of https://webapplog.com/error-handling-and-running-an-express-js-app/
// "A middleware function that takes 4 arguments is classified as "error handling middleware", and will only get called in an error occurs."
app.use(function (err, req, res, next) {
  // Do logging and user-friendly error message display
  console.error(err);
  if (res.statusCode === 400 && req.xhr) { //deal with ajax error
    res.send(err.message);
  }
});

app.listen(app.get('port'));
console.log('Magic happens on port ' + app.get('port'));

// ======================================================= //

//  // add to the database
//  db.documents.write({
//   uri: '/doc/test.json',
//   contentType: 'application/json',
//   content: {
//     url: req.body.website,
//     relation: req.body.relation,
//     wikiTag: req.body.wikiTag
//   }
// }).result(null, error => console.error(error));