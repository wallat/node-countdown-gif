'use strict';

// server
const express = require('express');
const app = express();
const path = require('path');

const tmpDir = __dirname + '/tmp/';
const publicDir = __dirname + '/public/';


/**
 * Returns a hash code for a string.
 * (Compatible to Java's String.hashCode())
 *
 * The hash code for a string object is computed as
 *     s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]
 * using number arithmetic, where s[i] is the i th character
 * of the given string, n is the length of the string,
 * and ^ indicates exponentiation.
 * (The hash value of the empty string is zero.)
 *
 * @param {string} s a string
 * @return {number} a hash code value for the given string.
 */
const hashCode = function(s) {
  var h = 0, l = s.length, i = 0;
  if ( l > 0 )
    while (i < l)
      h = (h << 5) - h + s.charCodeAt(i++) | 0;
  return h;
};

// canvas generator
const CountdownGenerator = require('./countdown-generator');

app.use(express.static(publicDir));
app.use(express.static(tmpDir));

// root
app.get('/', function (req, res) {
    res.sendFile(publicDir + 'index.html');
});

// generate and download the gif
app.get('/generate', function (req, res) {
    let {time} = req.query;
    let name = req.query.name = hashCode(JSON.stringify(req.query))

    if(!time){
        throw Error('Time parameter is required.');
    }

    CountdownGenerator.init(req.query, () => {
        let filePath = tmpDir + name + '.gif';
        res.download(filePath);
    });
});

// serve the gif to a browser
app.get('/serve', function (req, res) {
    let {time} = req.query;
    let name = req.query.name = hashCode(JSON.stringify(req.query))

    if(!time){
        throw Error('Time parameter is required.');
    }

    CountdownGenerator.init(req.query, () => {
        let filePath = tmpDir + name + '.gif';
        res.sendFile(filePath);
    });
});

app.listen(process.env.PORT || 3000, function(){
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});

module.exports = app;
