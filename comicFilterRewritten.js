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

var comicFilter = {
	execute(text, message) {
		switch (message.type) {
		case "system":
			return '<div class="frame system">' + message.content + '</div>';
			break;
		case "message":
			return '<div class="frame" style="background-color: ' + message.colors[0] + ';"><span class="name">' + message.username + ': </span><span class="content">' + message.content + '</span></div>';
			break;
		case "think":
			return '<div class="frame" style="background-color: ' + message.colors[0] + ';"><span class="name">' + message.username + ' (denkt): </span><span class="content">' + message.content + '</span></div>';
			break;
		case "outtime":
			return '<div class="frame" style="background-color: ' + message.colors[0] + ';"><span class="name">' + message.username + '</span> ((<span class="content">' + message.content + '</span>))</div>';
			break;
		case "me":
			return '<div class="frame" style="background-color: ' + message.colors[0] + ';"><span class="content">' + message.content + '</span></div>';
			break;
		case "tell":
			return '<div class="frame tell" style="background-color: ' + message.colors[0] + ';"><div class="content">' + message.content + '</div><div class="name" style="text-align: center;">' + message.username + '</div></div>';
			break;
		case "whisper":
			return '<div class="frame" style="background-color: ' + message.colors[0] + ';"><span class="name">Geflüstert ' + message.username + ': </span><span class="content">' + message.content + '</span></div>';
			break;
		default:
			console.log("Unknown", message, text);
			return '<div class="frame system">' + message.content + '</div>';
			break;
		}
	}
};

filter["message"].addLayer(comicFilter);
filter["whisper"].addLayer(comicFilter);
filter["system"].addLayer(comicFilter);

$('html > head').append($("<style>.name {font-weight: bold;} .frame{display:inline-block; width:100%; padding: 0px 3px; margin:0px; text-shadow: #010101 1px 1px, #010101 -1px 1px, #010101 1px -1px, #010101 -1px -1px; color: #fefefe;} .system{background-color:#333; color:#fff} hr{ margin-top: 0px;margin-bottom: 0px;border: 0; height: 1em; color: white; background-color: #ccc; padding: 0; margin: 0;} .room-inner, .chat-inner {border-radius: 0px;padding: 0px;} .tell{padding: 6px; border: 6px solid #010101; border-radius: 20px;} .tell .name{text-align:center;} a.charlink {background-color: currentColor; width: 100%; display: block; -webkit-text-fill-color: #fefefe; text-shadow: #010101 1px 1px, #010101 -1px 1px, #010101 1px -1px, #010101 -1px -1px; text-align: center;} .roomtitle { font-weight: bold; color: #fefefe; background-color: #333; text-align: center; padding: 3px; text-shadow: #010101 1px 1px, #010101 -1px 1px, #010101 1px -1px, #010101 -1px -1px; font-size: 1.2em;} .charlist i.fa{ float: right; margin-right: 2px; margin-top: 2px; color: white; text-shadow: #010101 1px 1px, #010101 -1px 1px, #010101 1px -1px, #010101 -1px -1px; }</style>"));
$("span[style*='display:block;background-color:rgba(255,255,255,0.2);margin-left:-6px;margin-right:-6px;padding-left:6px;padding-right:6px;']").remove();
$('#message').css({"color":"#fefefe", "border-color":"#222222", "background-color":"#010101"});
$(".roomtitle hr").remove();
