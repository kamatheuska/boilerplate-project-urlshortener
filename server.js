'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dns = require('dns');
const path = require('path');
const util = require('util');
const dnsLookupPromisfied = util.promisify(dns.lookup);
const { connectToMongoose } = require('./db');
const Url = require('./model/url');

const app = express();
const port = process.env.PORT || 3000;


connectToMongoose();

app.use(cors());
app.use('/public', express.static(process.cwd() + '/public'));
app.use(bodyParser.json())


app.get('/', function(req, res){
  res.sendFile(path.resolve(__dirname, 'views/index.html'));
});

app.get('/api/hello', function (req, res) {
  res.json({greeting: 'hello API'});
});

app.get('/api/shorturl/:id', (req, res, next) => {
  const short = req.params.id
  Url.findOne({ short }, function (error, url) {
    if (error) {
      next(error)
    } else if (url) {
      res.redirect(302, url.original)
      return;
    }
    next();
  });
});

function addHttp(url) {
    if (!/^(?:f|ht)tps?\:\/\//.test(url)) {
        url = 'http://' + url;
    }
    
    return url;
}

app.post('/api/shorturl/new', (req, res, next) => {
  const requestUrl = req.body.url
  console.info(`Looking address of ${requestUrl}`)
  dnsLookupPromisfied(requestUrl)
    .then((address) => {
      if (!address) {
        next(new Error('URL not valid!'))
      }


      Url.estimatedDocumentCount().exec((error, count) => {
        if (error) {
          res.status(500).send(error)
        }
        const originalUrl = addHttp(requestUrl);
        const currentCount = count + 1

        console.info(`saving following URL: ${originalUrl}`)

        const url = new Url({
          original: originalUrl,
          short: currentCount
        })

        url.save()
          .then((savedUrl) => {
            console.info(savedUrl)
            res.status(200).json({
              'original_url': savedUrl.original,
              'short_url': savedUrl.short
            });
          })
          .catch((error) => {
            res.status(500).send(error)
          })

      });
    })
    .catch(error => {
        return res.status(400).json({
          error: 'invalid URL'
        });
    })
});

app.use((error, req, res, next) => {
  console.error(error.stack)
  res.sendFile(path.resolve(__dirname, 'views/error.html'));
})

app.listen(port, function () {
  console.log(`Node.js listening to port ${port}...`);
});