var express = require('express');
var tileSaverServer = express();
var fs = require('fs');
var path = require('path');
var http = require('http');

tileSaverServer.use(express.static('public'));

fs.mkdirParent = function(dirPath, mode, callback) {
  //Call the standard fs.mkdir
  fs.mkdir(dirPath, mode, function(error) {
    //When it fail in this way, do the custom steps
    if (error && error.code === 'ENOENT') {
      //Create all the parents recursively
      fs.mkdirParent(path.dirname(dirPath), mode, callback);
      //And then the directory
      fs.mkdirParent(dirPath, mode, callback);
    }
    //Manually run the callback since we used our own callback to do all these
    callback && callback(error);
  });
};


var checkExists = function(saveTo) {
  try {
    fs.accessSync(saveTo, fs.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}

var saveTile = function(url, saveTo, cb) {
  var folders = saveTo.split('/');
  folders.splice(folders.length - 1, 1);
  //console.log('./' + folders.join('/'));
  fs.mkdirParent(folders.join('/'));

  var request = http.get(url, function(response) {
    var file = fs.createWriteStream(saveTo);
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb); // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    try{
      fs.unlink(saveTo); // Delete the file async. (But we don't check the result)
      if (cb) cb(err.message);
    }catch(e){
        console.log(e);
    }

  });

  return true;

}

tileSaverServer.get('/saveThis', function(req, res) {
  //console.log(req);
  var url = req.query.url;
  var folder = req.query.folder;
  var trimBefore = req.query.trimbefore;
  var fields = url.split(trimBefore);
  var last_index = fields.length - 1;
  var saveTo = folder + fields[last_index];
  //var saveTo = folder + url.split(trimBefore)[1];

  if (!url || !folder) {
    res.send('err');
  } else {
    var exists = checkExists(saveTo);
    if (!exists) {
      //console.log('saving', url, 'to', saveTo);
      saveTile(url, saveTo, function(e) {
        if (e) {
          console.log(e);
        } else {
          console.log('saved', saveTo);
        }
      });
    } else {
      //console.log('Already have', saveTo);
    }
  }
  res.send('ok');
});

tileSaverServer.listen(8080);
