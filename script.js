
function runGeneratorTest(){
	let stream = createStream([]);
	
	for(let i = 0; i < 100; i++){
		stream.push({ value: i });
	}


	function clientMethod(record){
		console.log(record);
	}


	let server = new GeneratorServer(stream);
	let client = new GeneratorClient(clientMethod, server);
	
	let interval = window.setInterval(function(){
		client.tick();
		server.tick();
	}, 20);
	
	let closer = window.setTimeout(function(){
		stream.close();
		client.terminate();
		window.clearInterval(interval);
	}, 3300);

}




function randomString(len){
	let res = [0];
	for(let i = (len || 10); i; i--){
		res[i] = (Math.random() * 256) >>0;
	
	}
	return String.fromCharCode.apply(String, res);
}

function hashString(str, key){
	let val = 5241;
	for(let i = 0; i < str.length; i++){
		val = (val << 5) + ((val - str.charCodeAt(i)) ^ key);
	}
	return val;
}




function createStream(vals = []){
	let values = vals;
	let push = Array.prototype.push;
	let offset = 0;
	
	values.running = true;

	values.close = function(){
		values.running = false;
	};

	values.add = function(...vals){
		if(values.running) return values.push.apply(values, vals);
		else return 0;
	};

	values.truncate = function(pos){
		let vals = values.splice(0, pos);
		// offset += vals.length;
		return vals;
	};

	values.page = function(pos, limit){
		return values.slice(pos, limit + pos);
	};

	return values;
}


class GeneratorServer {


	constructor (stream) {
		this.source = stream;
		this.cursors = [];
	}


	tick(){
		// in a real server you'd put this in an event loop...
		this.truncateStream();

	}

	truncateStream(){
		// Drops records from the stream up to the "earliest" session position.
		
		if(this.source.length){
			
			let min = Math.min(this.cursors.map((v) => v.position));
			console.log('Truncating stream: ', min);

			// Drop records that have already been processed by all cursors.
			this.source.truncate(min);

			// Update all cursors to the correct index.
			this.cursors.map((v) => { v.position -= min });
		}
		
	}

	createSession(clientId){
		let sessionId = hashString(clientId, this.cursors.length);
		this.cursors.push({
			sessionId: sessionId,
			position: 0
		});
		return sessionId;
	}

	closeSession(sessionId){
		console.log("Closing session", sessionId);
		let sessionIndex = this.cursors.findIndex((v) => (v.sessionId == sessionId));
		// drop the old session if found
		return (~sessionIndex) ? this.cursors.splice(sessionIndex, 1) : null;
	}

	getSession(sessionId){
		let session = this.cursors.find((v) => (v.sessionId == sessionId));		return session;	
	}

	nextPage(sessionId, pageSize){
		let session = this.getSession(sessionId);
		let pos = session.position;
		let page = {
			data: this.source.page(pos, pageSize),
			pageId: hashString(sessionId, pos)
		};

		session.position += page.data.length;
		
		return page;
	}


}

class GeneratorClient {

	constructor (callback, server) {
		this.clientId = randomString(10);
		this.callback = callback;
		this.server = server;
		this.sessionId = server.createSession(this.clientId);
		this.count = 0;

	}


	getPage(handler){
		let page = this.server.nextPage(this.sessionId, 10);
		return page.data.map((r, i) => {
			return handler.call(page, r, this.count++);
		});
	}

	
	terminate(){
		this.server.closeSession(this.sessionId);
	}	

	tick(){
		this.getPage(this.callback);
	}

}


runGeneratorTest();
