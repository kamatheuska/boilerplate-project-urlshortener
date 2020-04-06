const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  original: String,
  short: String
})

urlSchema.pre('save', function () {

  function addHttp(url) {
      if (!/^(?:f|ht)tps?\:\/\//.test(url)) {
          url = 'http://' + url;
      }
      
      return url;
  }

  this.original = addHttp(this.original);
  return; 
})


const Url = mongoose.model('Url', urlSchema)
module.exports = Url;