// .listen(8124, "178.63.149.193");
var http = require("http"), fs	 = require("fs"), sys = require('util');
var filename = "/p2pool.out";
 
var tail = require('child_process').spawn;
var watchtail = tail('tail', ['-f', filename]);
watchtail.stdout.on('data', function(data) {
	console.log("stdout");
	var x = String(data).split('\n');
	var toSend = "[";
	for(var i=0; i<x.length; i++) {
		if(x[i].replace(/^\s+|\s+$/g, '') == "") {
			continue;
		}
		var json = pool2json(x[i]);
		if(json == "") {
			continue;
		}
		console.log('	[' + i + '] ' + json);
		if(toSend.length > 1) {
			toSend = toSend + ", ";
		}
		toSend = toSend + json;
	}
	
	if(lastPool != "") {
		if(toSend.length > 1) {
			toSend = toSend + ", ";
		}
		toSend = toSend + lastPool;
	}
	
	if(lastAVG != "") {
		if(toSend.length > 1) {
			toSend = toSend + ", ";
		}
		toSend = toSend + lastAVG;
	}
	
	if(lastStales != "") {
		if(toSend.length > 1) {
			toSend = toSend + ", ";
		}
		toSend = toSend + lastStales;
	}
	
	send(toSend + "]");
});

var lastPool = "";
var lastAVG = "";
var lastStales = "";

function pool2json(line) {
	/*
13:55:48.085109 New work for worker chaos! Difficulty: 29.376314 Payout if block: 1.198303 BTC Total block value: 50.020000 BTC including 39 transactions
13:55:49.008082 Pool: 15905MH/s in 17347 shares (17352/17352 verified) Recent: 2.18% >347MH/s Shares: 3 (0 orphan, 0 dead) Peers: 15
13:55:49.008236 Average time between blocks: 3.61 days
13:55:49.008354 Pool stales: 15% Own: 28?28% Own efficiency: 84?33%	
	*/
	
	var parse = line.substr(16);
	if(startsWith(parse, "New work for worker")) {
		var regex = /New work for worker ([a-z]*)! Difficulty: ([0-9\.]*) Payout if block: ([0-9\.]*) BTC Total block value: ([0-9\.]*) BTC including ([0-9]*) transactions/
		var match = line.match(regex);
		return '{type:"WORKER", workerName:"' + match[1] + '", difficulty:"' + match[2] + '", payoutIfBlock:"' + match[3] + '", blockValue:"' + match[4] + '", transactionCount:"' + match[5] + '"}';
	}
	
	if(startsWith(parse, "Pool: ")) {
		var regex = /Pool: ([0-9]*)MH\/s in ([0-9]*) shares \([0-9]*\/[0-9]* verified\) Recent: ([0-9\.]*)% >([0-9]*)MH\/s Shares: ([0-9]*) \(([0-9]*) orphan, ([0-9]*) dead\) Peers: ([0-9]*)/
		var match = line.match(regex);
		lastPool = '{type:"POOL", mhash:"' + match[1] + '", shares:"' + match[2] + '", recent:"' + match[3] + '", mymhash:"' + match[4] + '", myshares:"' + match[5] + '", orphan:"' + match[6] + '", dead:"' + match[7] + '", peers:"' + match[8] + '"}';
	}
	
	if(startsWith(parse, "Average time between blocks: ")) {
		var regex = /Average time between blocks: ([0-9\.]*) days/
		var match = line.match(regex);
		lastAVG = '{type:"AVG", avg:"' + match[1] + '"}';
	}
	
	if(startsWith(parse, "Pool stales: ")) {
		var regex = /Pool stales: ([0-9]*)% Own: ([0-9]*)\?([0-9]*)% Own efficiency: ([0-9]*)\?([0-9]*)%/
		var match = line.match(regex);
		lastStales = '{type:"STALES", poolStales:"'+ match[1] + '", myStales:"' + match[2] + '", myStalesVar:"' + match[3] + '"}';
	}
	
	return "";
}

function startsWith(str, search) {
	return (str.substring(0, search.length) == search);
}

var requests = new Array();

// we create a server with automatically binding
// to a server request listener
http.createServer(function(request, response) {
	console.log("response " + request.url);
	
	if(request.url.length > 3 && request.url.substring(0, 4) == '/api') {
		requests.push(response);
	} else {
		console.log(" -> index.html");
		fs.readFile('/var/www/index.html', function(error, content) {
				if (error) {
					console.log("err");
					response.writeHead(500);
					response.end();
				}
				else {
					response.writeHead(200, { 'Content-Type': 'text/html' });
					response.end(content, 'utf-8');
				}
			});		
	}
	
	
}).listen(8124);
 
function send(message) {
	var x = requests;
	requests = new Array();
	for(var i in x) {
		var response = x[i];
		response.writeHead(200, {
			'Content-Type'   : 'text/plain',
			'Access-Control-Allow-Origin' : '*'
		});
 
		response.write(message, 'utf8');
		response.end();
	}
}
