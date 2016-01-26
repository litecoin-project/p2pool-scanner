
var fs = require('fs'),
    http = require('http'),
    exec = require('child_process').exec,
	_ = require('underscore'),
    Geo = require('./geo'),
    dns = require('dns');

var nsLookup = function(ip, timeout, callback) {
  var callbackCalled = false;
  var doCallback = function(err, domains) {
    if (callbackCalled) return;
    callbackCalled = true;
    callback(err, domains);
  };

  setTimeout(function() {
    doCallback(new Error("Timeout exceeded"), null);
  }, timeout);

  dns.reverse(ip, doCallback);
};
/*
nsLookup('192.168.0.10', 1000, function(err, addresses) {
 // console.log("Results for stackoverflow.com, timeout 1000:");
  if (err) {
    console.log("Err: " + err);
    return;
  }
 // console.log(addresses);
});
*/

function dpc(t,fn) { if(typeof(t) == 'function') setTimeout(t,0); else setTimeout(fn,t); }

function Scanner(options) {

	var self = this;
    self.options = options;

    var config = eval('('+fs.readFileSync("scanner.cfg",'utf8')+')');
    var upload = fs.existsSync('upload.cfg') ? eval('('+fs.readFileSync("upload.cfg",'utf8')+')') : null;

    self.addr_pending = { }     // list of addresses waiting scan
    self.addr_digested = { }    // list of scanned addresses
    self.addr_working = { }     // list of working addresses
    
    var peers = "";
    var timeout = { timeout : config.http_socket_timeout };

    self.geo = new Geo(timeout);
    var pool_hash = 0;
    self.stored = 0;
  	// -----------------------------------------
   	// local http server interface 
    if(config.http_port) 
    {
        var express = require('express');
	var bodyParser = require('body-parser')
        var app = express();
	var env = process.env.NODE_ENV || 'all';
	if ('all' == env) {
          //  app.use(bodyParser());
	  app.use(bodyParser.urlencoded({extended: true}));
	  app.use(bodyParser.json());
        };
        app.get('/', function(req, res) {
            var str = self.render();
            res.write(str);
            res.end();
        });
        
        http.createServer(app).listen(config.http_port, function() {
            console.log("HTTP server listening on port: ",config.http_port);    
        });
    }

    var logo = fs.readFileSync("resources/"+config.currency.toLowerCase()+".png","base64");
    if(logo)
        logo = "data:image/png;base64,"+logo;


    self.render = function() {
      var data ="", ipdata="", other = 0;
        var str = "<html><head><META HTTP-EQUIV='refresh' CONTENT='300'>"
	    +"<META HTTP-EQUIV='CACHE-CONTROL' CONTENT='NO-CACHE'>"
	    +"<meta charset='utf-8'>"
            +"<style>"
            +"body { font-family: Consolas; font-size: 14px; background-color: #fff; color: #000; }"
            +"a:link { text-decoration: none; color: #0051AD; }"
            +"a:visited { text-decoration: none; color: #0051AD; }"
            +"a:hover { text-decoration: none; color: #F04800; }"
            +".row-grey { background-color: #f3f3f3;  }"
            +".p2p {  width: 790px; margin-left: 150px; border: 1px solid #aaa;  box-shadow: 2px 2px 2px #aaa; padding: 2px;  }"
            +".p2p-row { width: 780px; padding: 5px; height: 16px; }"
            +".p2p-caption { width: 780px; text-align: center;  background-color: #ddd; padding-top: 4px; padding-bottom: 8px;}"
            +".p2p div { float : left; }"
            +".p2p-ip { width: 200px; text-align:left; }"
            +".p2p-fee { margin-left: 10px; width: 90px; text-align: center;}" 
	    +".p2p-hash { margin-left: 10px; width: 90px; text-align: center;}"
            +".p2p-uptime { margin-left: 10px; width: 100px; text-align: center;}"
            +".p2p-geo { margin-left: 40px; width: 228px; text-align: left;}"
	    +".p2p-footer {align='center'; border-top : 1px solid #aaa;}"
            +"img { border: none;}"
	    + "canvas { width :400px; height : 400px; align='center'; margin-left: 200px;  padding: 20px;}"
            +"</style>"
	   
            +"</head><body>"
	    +"<script src='http://cdnjs.cloudflare.com/ajax/libs/ocanvas/2.5.0/ocanvas.min.js'></script>"
	    +"<script src='http://p2pool.neoscrypt.de/js/drawpie.js'></script>"
//	    +"<script src='http://p2pool.neoscrypt.de/js/drawpie2.js'></script>"
	
        if(logo)
            str += "<div style='float:left;margin-left:150px;margin-top:16px;'><img src=\""+logo+"\" /></div>"; //<br style='clear:both;'/>";
        str += "<center><a href='https://github.com/forrestv/p2pool' target='_blank'>PEER TO PEER "+(config.currency.toUpperCase())+" MINING NETWORK</a> - PUBLIC NODE LIST<br/><span style='font-size:10px;color:#333;'>GENERATED ON: "+(new Date())+"</span></center><p/>"
        if(self.poolstats)
	    pool_hash = (self.poolstats.pool_hash_rate/1000000).toFixed(2);
            str += "<center>Pool speed: "+pool_hash+" "+config.speed_abbrev+"</center>";
        str += "<center>Currently observing "+(self.nodes_total || "N/A")+" nodes.<br/>"+_.size(self.addr_working)+" nodes are public with following IPs:</center><p/>";
        str += "<div class='p2p'>";
        str += "<div class='p2p-row p2p-caption'><div class='p2p-ip'>IPs</div><div class='p2p-fee'>Fee</div><div class='p2p-hash'>Hashrate</div><div class='p2p-uptime'>Uptime</div><div class='p2p-geo'>Location</div>";
        str += "</div><br style='clear:both;'/>";
	
        //var list = _.sortBy(_.toArray(self.addr_working), function(o) { return o.stats ? -o.stats.uptime : 0; })
	var list = _.sortBy(_.toArray(self.addr_working), function(o) { return o.stats ? -o.stats.my_hash_rates_in_last_hour.actual : 0; })
	data +="[";
	ipdata +="[";
        var row = 0;
        _.each(list, function(info) {
            var ip = info.ip;
	    if (info.stats){
	      var hash = ((info.stats.my_hash_rates_in_last_hour.actual/1000000).toFixed(3)||0);
	      var uptime = info.stats ? (info.stats.uptime / 60 / 60 / 24).toFixed(1) : "N/A";
	    }
	    var fee = (info.fee || 0).toFixed(2);
	    if (!info.domain) { info.domain=info.ip;}
	    if (pool_hash >0) {
	
		if(hash/pool_hash > 0.02) {
		    data += (100*hash/pool_hash).toFixed(2)+", ";
		        ipdata +="'"+ info.domain+":"+config.worker_port+"',";
	//		console.log(ipdata);
			
		}
		else {
		  if ( hash > 0 ) {
		    other=parseInt(other)+parseInt((100*hash/pool_hash).toFixed(2));
		  }
		}
	   
            str += "<div class='p2p-row "+(row++ & 1 ? "row-grey" : "")+"'><div class='p2p-ip'><a href='http://"+ip+":"+config.worker_port+"/static/' target='_blank'>"+info.domain.toString().substr(0,25)+"</a></div><div class='p2p-fee'>"+info.fee+"%</div><div class='p2p-hash'>"+hash+"</div><div class='p2p-uptime'>"+uptime+" days</div>";
            str += "<div class='p2p-geo'>\n";
            if(info.geo) {
                str += "<a href='http://www.geoiptool.com/en/?IP="+info.ip+"' target='_blank'>"+info.geo.country+" "+"<img src='"+info.geo.img+"' align='absmiddle' border='0'/></a>";
            }
            str += "</div>\n";	//p2p-geo   
            str += "</div>\n"; //p2p-row
	   
            str += "<br style='clear:both;'/>";
	    }
        })
	 data += other+"]";
	 ipdata+= "'small nodes']";
	// str+= "<div class='p2p-row p2p-footer'><center>"+_.size(self.addr_digested)+" von "+self.nodes_total+" of nodes scanned</center></div>";
	 str += "<div><canvas id='canvas' class='canvas'></canvas></div>"  
	 str += "</div>\n";
	 str += "</div>\n";
         str += "<script> drawpie("+ipdata+", "+data+"); </script>";
         str += "</body>"
         return str;
    }

    // setup flushing of rendered HTML page to a file (useful for uploading to other sites)
    if(config.flush_to_file_every_N_msec && config.flush_filename) {
        function flush_rendering() {
	 //   console.log(Date("ddmmyy hh:mm:ss")," Updating html page");
            var str = self.render();
            fs.writeFile(config.flush_filename, str, { encoding : 'utf8'});
            dpc(config.flush_to_file_every_N_msec, flush_rendering);
        }

        dpc(2*60*1000, flush_rendering); // every 2 minutes
    }

    // defer init
    dpc(function(){
        self.restore_working();
        self.update();
    })

    var p2pool_init = true;

    // main function that reloads 'addr' file from p2pool
    self.update = function() {
        var filename = config.addr_file;
        if(!fs.existsSync(filename)) {
            console.error("Unable to fetch p2pool address list from:",config.addr_file);
            filename = config.init_file;    // if we can't read p2pool's addr file, we just cycle on the local default init...
        }

        fs.readFile(filename, { encoding : 'utf8' }, function(err, data) {
            if(err) {
                console.error(err);
            }
            else {
                try {
                    var addr_list = JSON.parse(data);
                    self.inject(addr_list);                    

                    // main init
                    if(p2pool_init) {
                        p2pool_init = false;

                        // if we can read p2pool addr file, also add our pre-collected IPs
                        if(filename != config.init_file) {
                            var init_addr = JSON.parse(fs.readFileSync(config.init_file, 'utf8'));
                            self.inject(init_addr);                    
                        }

                        for(var i = 0; i < (config.probe_N_IPs_simultaneously || 1); i++)
                            self.digest();
                //        dpc(60*1000, function() { self.store_working(); })
                    }
                }
                catch(ex) {
                    console.error("Unable to parse p2pool address list");
                    console.error(ex);
                }
            }
          // not needed, as node list is updated based on connecion info of working pools now
	  //  dpc(1000 * 60 * 60, self.update);  //every 60 minutes
        })
    }
    
    // store public pools in a file that reloads at startup
    self.store_working = function() {
	console.log("Storing working addresses to file");
        var data = JSON.stringify(self.addr_working);
        fs.writeFile(config.store_file, data, { encoding : 'utf8' }, function(err) {
	  
	  if (err) {
	    console.error( "Error saving working addresses");
	    console.error(err);
	  }
	  
        })
    }

    // reload public list at startup
    self.restore_working = function() {
        try {
            self.addr_working = JSON.parse(fs.readFileSync(config.store_file, 'utf8'));
        } catch(ex) { /*console.log(ex);*/ }
    }

    // inject new IPs from p2pool addr file
    self.inject = function(addr_list) {
        _.each(addr_list, function(info) {
            var ip = info[0][0];
            var port = info[0][1];

            if(!self.addr_digested[ip] && !self.addr_pending[ip]) {
                self.addr_pending[ip] = { ip : ip, port : port }
            //   console.log("injected:"+ip);
            }

            self.nodes_total = _.size(self.addr_digested) + _.size(self.addr_pending);
        });
    }

    // as we scan pools, we fetch global info from them to update the page
    self.update_global_stats = function(poolstats) {
        self.poolstats = poolstats;
    }

    // execute scan of a single IP
    self.digest = function() {
	var payout_addr=""
        if(!_.size(self.addr_pending))
            return self.list_complete();

        var info = _.find(self.addr_pending, function() { return true; });
        delete self.addr_pending[info.ip];
        self.addr_digested[info.ip] = info;
        console.log("P2POOL DIGESTING:",info.ip);

        digest_ip(info, function(err, payout_addr){
           
	    if ((!err) && ((payout_addr[0] == config.addr_prefix)||(payout_addr[0] == config.addr_prefix2))) {
                self.addr_working[info.ip] = info;
         //     console.log("FOUND WORKING POOL: ", info.ip);
	    if(!info.domain) {	
            nsLookup(info.ip, 1000, function(err, addresses) {
		if (err) {
		  console.log("Err: " + err);
		  info.domain= info.ip;
		}
	        info.domain = addresses;
	    });
	    }
	    digest_fee(info, function(err, fee){
		if(!err) {
		    info.fee = fee;
		    // console.log("fee ", info.ip);
		    digest_peer_addresses(info, function(error, peers) {
			if(!err){
			      update_addrs_list(peers);
			      digest_local_stats(info, function(err, stats) {
				  if(!err){
				  //  console.log("localstats ",info.ip);
				      info.stats = stats;
				      digest_global_stats(info, function(err, stats) {
				      if(!err){
					 // console.log("global_stats ",stats," ", info.ip);
					  self.update_global_stats(stats);
				      

					  if(!info.geo)
					      self.geo.get(info.ip, function(err, geo) {
						  if(!err){
						      info.geo = geo;
						  }
						  else
						      console.error("Geo-error: ",err);
					      });
					  }
				    });
				  }
			    });  //local_stats
			}
		    });  //peer_addresses
		    
		} 
	    });//fee
	    continue_digest();
            }
            else {
                delete self.addr_working[info.ip];
		delete self.addr_digested[info.ip];
		delete self.addr_pending[info.ip];
		console.log( "Deleted: "+info.ip);
		self.store_working();
                continue_digest();
            }

            function continue_digest() {
	      self.nodes_total = _.size(self.addr_digested) + _.size(self.addr_pending);
                self.working_size = _.size(self.addr_working);
		console.log(self.nodes_total);
                dpc(self.digest);
            }
        });
    }

    // schedule restar of the scan once all IPs are done
    self.list_complete = function() {
        console.log(Date("ddmmyy hh:mm")," Scan done. Next scan in ",config.rescan_list_delay/1000, " seconds");
        self.addr_pending = self.addr_digested;
        self.addr_digested = { }
        dpc(config.rescan_list_delay, self.digest);
    }

    // function to update the address file based on peers addresses of a p2pool node
    
    function update_addrs_list(peers){
      if (peers) {
	var peer_list = peers.split(" ");
	//console.log("peers: ", peer_list);
	var list = {};
	_.each(peer_list,function(info) {
	    var host = info.split(":");
	    //console.log("test: ",host," ", host[0],"/",host[1]);
	    ip = host[0];
	    port= config.worker_port;
	    if(!self.addr_digested[ip] && !self.addr_pending[ip]) {
		    self.addr_pending[ip] = { ip : ip, port : port }
	    }
	})
    }      
    }
    // functions to fetch data from target node IP

    function digest_ip(info, callback) {

        var options = {
          host: info.ip,
          port: config.worker_port,
          path: '/payout_addr',
          method: 'GET'
        };
        self.request(options, callback);
    }
    
    function digest_fee(info, callback) {

        var options = {
          host: info.ip,
          port: config.worker_port,
          path: '/fee',
          method: 'GET'
        };
        self.request(options, callback);
    }
    
    function digest_peer_addresses(info, callback) {

        var options = {
          host: info.ip,
          port: config.worker_port,
          path: '/peer_addresses',
          method: 'GET'
        };

        self.request(options, callback);
    }

    function digest_local_stats(info, callback) {

        var options = {
          host: info.ip,
          port: config.worker_port,
          path: '/local_stats',
          method: 'GET'
        };

        self.request(options, callback);
    }

    function digest_global_stats(info, callback) {

        var options = {
          host: info.ip,
          port: config.worker_port,
	  path: '/global_stats',
          method: 'GET'
        };
	
          

        self.request(options, callback);
    }

    // make http request to the target node ip
    self.request = function(options, callback, is_plain)
    {    
        http_handler = http;
        var req = http_handler.request(options, function(res) {
            res.setEncoding('utf8');
            var result = '';
            res.on('data', function (data) {
                result += data;
            });

            res.on('end', function () {
                if(options.plain)
                    callback(null, result);
                else {
                    try {
                        var o = JSON.parse(result);
                        callback(null, o);
                    } catch(ex) {
                        console.error(ex);
                        callback(ex);
                    }
                }
            });
        });

        req.on('socket', function (socket) {
            socket.setTimeout(config.http_socket_timeout);  
            socket.on('timeout', function() {
                req.abort();
            });
        });

        req.on('error', function(e) {
            callback(e);
        });

        req.end();
    }

    if(upload && process.platform != 'win32') {

        function do_upload() {

            if(upload.ftp) {
                var ftp = upload.ftp;
                if(!ftp.address || !ftp.username || !ftp.password)
                    return console.error("upload.cfg ftp configuration must contain target address, username and password");
                var cmd = "curl -T "+config.flush_filename+" "+ftp.address+" --user "+ftp.address+":"+ftp.password;
                exec(cmd, function(error){ if(error) console.error(error); });
            }

            if(upload.scp) {
                var scp = upload.scp;
                if(!scp.address)
                    return console.error("upload.cfg scp configuration must contain target address");
                var cmd = "scp -q  ./"+config.flush_filename+" "+scp.username+"@"+scp.address+" < ./scp.cnf";
                exec(cmd, function(error){ if(error) console.error(error); });
            }

            dpc(config.upload_interval, do_upload);
        }

        dpc(5000, do_upload);
    }
    else
        console.log("upload.cfg not found, rendering available only on the local interface");
}


GLOBAL.scanner = new Scanner();


//  
