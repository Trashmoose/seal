<script>
javascript:if (typeof filter == 'undefined') {
	/*cleans up original seal textdata*/
	var messageExtractor = {
		extractColors: function() {
			let colors = [];
			let regex = /<span style="color:(#[a-f0-9]{3,6});?">/gi;
			while (item = regex.exec(this.text)) {
				colors.push(item[1]);
			}
			this.colors = colors;
		},
		removeSpans: function() {
			this.text = this.text.replace(/<\/?span.*?>/gi, "");
		},
		regex: {
			message: /^<b>(.*?):<\/b> (.*)$/i,
			think: /^<b>(.*)<\/b> .oO\((.*)\)$/i,
			outtime: /^\(\((.*?): (.*)\)\)$/i,
			me: /^<i>(.*)<\/i>$/i,
			tell: /^<b>(.*)<\/b><br>\(<i>von (.*)<\/i>\)$/i,
			whisper: /^<b>• Geflüstert (von|zu) (.*)<\/b>: (.*)$/i,
		},
		createMessage: function() {
			switch (true) {
				case (this.context == "system"):
					this.message = {
						"username":undefined,
						"content":this.text,
						"colors": this.colors,
						"type": "system"
						};
					break;
				case ((match = this.regex.message.exec(this.text)) !== null):
					this.message = {
						"username":match[1],
						"content":match[2],
						"colors": this.colors,
						"type": "message"
						};
					break;
				case ((match = this.regex.think.exec(this.text)) !== null):
					this.message = {
						"username":match[1],
						"content":match[2],
						"colors": this.colors,
						"type": "think"
						};
					break;
				case ((match = this.regex.outtime.exec(this.text)) !== null):
					this.message = {
						"username":match[1],
						"content":match[2],
						"colors": this.colors,
						"type": "outtime"
						};
					break;
				case ((match = this.regex.me.exec(this.text)) !== null):
					this.message = {
						"username":undefined,
						"content":match[1],
						"colors": this.colors,
						"type": "me"
						};
					break;
				case ((match = this.regex.tell.exec(this.text)) !== null):
					this.message = {
						"username":match[2],
						"content":match[1],
						"colors": this.colors,
						"type": "tell"
						};
					break;
				case ((match = this.regex.whisper.exec(this.text)) !== null):
					this.message = {
						"username":match[2],
						"content":match[3],
						"colors": this.colors,
						"type": "whisper",
						"receiver": match[1]==="von"
						};
					break;
				default:
					this.message = {
						"username":undefined,
						"content":this.text,
						"colors": this.colors,
						"type": "unknown"
						};
					break;
			}
		},
		
		extractMessage: function(text, context) {
			this.text = text;
			this.context = context;
			this.extractColors();
			this.removeSpans();
			this.createMessage(message);
			return this.message;
		}
	};

	class Filter {
		constructor(originalFunction) {
			this.originalFunction = originalFunction;
			/*original function, will be called last*/
			this.layers = [];
			/*layers of the filter, each will be called with the execute-method, parameters: event and original event*/
		}
		addLayer(layer) {
			this.layers.push(layer);
		}
		apply(event) {
			/*message: hash with username, content, color, type*/
			let message = messageExtractor.extractMessage(event.data, event.type);
			
			for (var i = this.layers.length - 1; i >= 0; i--) {
				/*FILO*/
				event.data = this.layers[i].execute(event.data, message);
			}
			this.originalFunction(event);
		}
	}
	var filter = [];
	filter["message"] = new Filter(ws._settings.events.message);
	filter["whisper"] = new Filter(ws._settings.events.whisper);
	filter["system"] = new Filter(ws._settings.events.system);
	ws._settings.events.message = function(event) {
		filter["message"].apply(event);
	}
	;
	ws._settings.events.whisper = function(event) {
		filter["whisper"].apply(event);
	}
	;
	ws._settings.events.system = function(event) {
		filter["system"].apply(event);
	}
	;
}
if (filter["system"].layers.length == 0) {
	filter["system"].originalFunction = function(event) {
		/*replaced original, because, well, i didn't need another outer border (soulan, why don't you give your added spans just classes?*/
		$('#content').append(event.data + '<br/>');
		scroll();
	}
	;
}


/*inividual work*/

class Dice {
	constructor(number,sides) {
		this.number = number;
		this.sides = sides;
		}
	betterRandomValue(range) {
		/* Create byte array and fill with 1 random number */
		var byteArray = new Uint8Array(1);
		window.crypto.getRandomValues(byteArray);

		var max_range = 256;	
		if (byteArray[0] >= Math.floor(max_range / range) * range)
			return this.betterRandomValue(range);

		return (byteArray[0] % range) + 1;
	}
	
	throw(){
		this.results = [];
		for (var i = 0; i < this.number; i++) {
			this.results.push(this.betterRandomValue(this.sides));
			}
		}

	asString(){
		return "#" + this.results.join("#,#")+"#";
		}
}
	
var diceFilter = {	
	regex: {
		message: /^!((?:\d+[wd]\d+,?)*)(?: (.*))?/i,
		dice: /(\d+)[wd](\d+)/ig
		},
	
	execute(text, message) {
		if (message.type === "message" || (message.type === "whisper" && message.receiver)){
			if ((match = this.regex.message.exec(message.content)) !== null){
				let diceResults = [];
				while ((diceMatch = this.regex.dice.exec(match[1])) !== null) {
					let dice = new Dice(diceMatch[1], diceMatch[2]);
					dice.throw();
					diceResults.push(dice.asString());
				}
				
				let text = match[2] == undefined ? "" : "\"" + match[2].replace(/<\/?[^>]+(>|$)/g, "") + "\" ";
				text = text.replace(/[*.~#]/g, "");
				let answerString = text + "("+ match[1] + ") für #" + message.username + "#" + ": " + diceResults.join(",");
				ws.send('message', answerString);
			}
		}
		
		return text;
	}
};

filter["message"].addLayer(diceFilter);
filter["whisper"].addLayer(diceFilter);
