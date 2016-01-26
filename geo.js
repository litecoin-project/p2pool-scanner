
// if you know of a better way or a public geolocation API, please modify this!

var https = require('https')

function Geo(options1) {
    var self = this;
        
    function request(options, callback)
    {    
        http_handler = https;
        var req = http_handler.request(options, function(res) {
            res.setEncoding('utf8');
            var result = '';
            res.on('data', function (data) {
                result += data;
            });

            res.on('end', function () {
                callback(null, result);
            });
        });

        req.on('socket', function (socket) {
            socket.setTimeout(options1.timeout);  
            socket.on('timeout', function() {
                req.abort();
            });
        });

        req.on('error', function(e) {
            callback(e);
        });

        req.end();
    }

    function extract_geo(html) {
        
        // if you have a better way of doing this
        // or know of a free geoip locator, then
        // please change this!
      
        html = html.replace(/[\r\n\t]/g, "");
        var b = html.match(/Country:<\/span>.{1,80}<\/span>/g);
        var c = b[0].match(/src=\".*\>/g);
	var img = "http://www.geoiptool.com/" +String(c).substring(8, String(c).indexOf("gif")+3);
        var d = String(b);
        var country = d.substring(d.indexOf("gif")+5,d.indexOf("/span>,")-1);
        
        var o = {
            country : country,
            img : img
        }

        return o;
    }

    self.get = function(ip, callback) {

        // console.log("QUERYING IP:",ip);
        var options = {
            host : 'www.geoiptool.com',
            port : 443,
            path: '/en/?IP='+ip,
            method: 'GET'
	}
        
        request(options, function(err, response) {
	  
            if(err){
	      console.log("geo-reqest: error");
                return callback(err);
	    }
	   
            var geo = null;
            try {
                var geo = extract_geo(response);
                 
            } catch(ex) {
                console.error(ex);
		return callback(ex,geo);
            }

            return callback(null, geo);

        }, true);
    }

}

module.exports = Geo;
