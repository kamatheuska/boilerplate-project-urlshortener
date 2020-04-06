'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dns = require('dns');
const path = require('path');
const util = require('util');
const { URL } = require('url');
const dnsLookupPromisfied = util.promisify(dns.lookup);
const { connectToMongoose } = require('./db');
const Url = require('./model/url');

const app = express();
const port = process.env.PORT || 3000;


connectToMongoose();

app.use(cors());
app.use('/public', express.static(process.cwd() + '/public'));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))
app.set('view engine', 'pug')

app.get('/', function(req, res){
  res.render('startpage', {
    title: 'API Project: URL Shortener Microservice',
  })
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

app.post('/api/shorturl/new', (req, res, next) => {
  const requestUrl = req.body.url;
  let urlHostname;
  if (/^(?:f|ht)tps?\:\/\//.test(requestUrl)) {
    urlHostname = new URL(requestUrl).hostname;
  } else {
    urlHostname = requestUrl
  }
  console.info(`Looking address of ${urlHostname}`);

  dnsLookupPromisfied(urlHostname)
    .then((address) => {
      if (!address) {
        next(new Error('URL not valid!'));
      }

      return Url.estimatedDocumentCount().exec();
    })
    .then((count) => {
      console.info(`saving following URL: ${urlHostname}`);

      if (count > 100) {
        next(new Error('Database capacity limit reached. Please Contact the administrator.'))
      }


      const currentCount = count + 1;
      const url = new Url({
        original: urlHostname,
        short: currentCount
      })

      return url.save()
    })
    .then((savedUrl) => {
      console.info(savedUrl);
      res.render('success', {
        originalUrl: savedUrl.original,
        shortUrl: savedUrl.short
      });

    })
    .catch(next)
});

app.use((error, req, res, next) => {
  console.error(error)
  res.render('error', {
    title: 'Error on server',
    errorMessage: error.message,
    stack: error.stack
  })
})

app.listen(port, function () {
  console.log(`Node.js listening to port ${port}...`);
});