
var soundEvents = [
	"abort","canplay","canplaythrough","dataunavailable","durationchange",
	"emptied","empty","ended","error","loadeddata","loadedmetadata","loadstart",
	"pause","play","playing","progress","ratechange","seeked","seeking",
	"suspend","timeupdate","volumechange","waiting"
];

var Audio = function(){
	this.songId;
	this.listeners = {};
	this.sound;
	this.playing = false;
};

Audio.prototype.initSound = function(dir){
	this.sound = new buzz.sound(dir);
	for(var i = 0, l = soundEvents.length; i < l; ++i){
		var self = this;
		this.sound.bind(soundEvents[i], function(event){
			self.eventListener(event);
		});
	}
};

Audio.prototype.addListener = function(events, func, object){
	if(typeof events == "string"){
		events = [events];
	}
	for(var i = 0, l = events.length; i < l; ++i){
		var event = events[i];
		if(!this.listeners[event]){
			this.listeners[event] = [];
		}
		this.listeners[event].push({
			"object": object,
			"func": func
		});
	}
};

Audio.prototype.errorCode = function(){
	if(this.sound && this.sound.sound && this.sound.sound.error){
		return this.sound.sound.error.code;
	}
}

Audio.prototype.eventListener = function(event){
	debug && console.log("Audio: ", event.type);
	var self = this;
	switch(event.type){
		case "error":
			if(this.errorCode() != 3){
				return authCheck(function(){
					self.abortPlay();
				});
			}
			event = new Event("ended");
			break;
		case "playing":
			this.playing = true;
			break;
		case "pause":
			this.playing = false;
			break;
	}
	
	var li = this.listeners[event.type];
	if(li && li.length){
		for(var i = 0, l = li.length; i < l; ++i){
			if(li[i].object){
				li[i].func.apply(li[i].object, [event, this]);
			}else{
				li[i].func(event, this);
			}
		}
	}
};

Audio.prototype.abortPlay = function(){
	this.stop();
	playlist.abortPlayAndRemove(this.songId);
};

Audio.prototype.isPlaying = function(){
	return this.playing;
};

Audio.prototype.load = function(){
	this.sound.load();
};

Audio.prototype.getPlayTime = function() {
	return this.parseTime(parseInt(this.sound.getTime(), 10));
};

Audio.prototype.getDuration = function(){
	return this.parseTime(parseInt(this.sound.getDuration(), 10));
};

Audio.prototype.parseTime = function(totalSec) {
	var hours = parseInt(totalSec / 3600) % 24;
	var minutes = parseInt(totalSec / 60) % 60;
	var seconds = totalSec % 60;
	return (hours < 10 ? "0" + hours : hours) + ":"
			+ (minutes < 10 ? "0" + minutes : minutes) + ":"
			+ (seconds < 10 ? "0" + seconds : seconds);
}

Audio.prototype.getPlayProgress = function() {
	return parseInt(this.sound.getPercent(), 10);
};

Audio.prototype.getDownloadProgress = function() {
	if (!this.sound.getDuration() > 0) {
		return false;
	}
	var t1 = this.sound.getBuffered();
	if (t1 && t1[0]) {
		var t2 = t1[0].end;
		if (t2) {
			var duration = this.sound.getDuration();
			var data = parseInt((
				parseInt(t2, 10) / parseInt(duration, 10)
			) * 100, 10);
			return data;
		}
	}
};

Audio.prototype.getVolume = function(){
	return this.sound && this.sound.getVolume();
};

Audio.prototype.setVolume = function(value){
	return this.sound && this.sound.setVolume(value);
};

Audio.prototype.setSrc = function(song){
	if(!this.sound){
		this.songId = song.uuid;
		this.initSound(song.dir + "?service=songs");		
	}
	if(this.songId != song.uuid){
		this.songId = song.uuid;
		this.sound.set("src", song.dir + "?service=songs");
	}
};

Audio.prototype.setPercent = function(value){
	if(this.sound){
		this.sound.setPercent(value);
	}
};

Audio.prototype.getPercent = function(){
	if(this.sound){
		return this.sound.getPercent();
	}
};

Audio.prototype.togglePlay = function(time){
	if(time){
		//disabling for now
		//this.setSeconds(time);
	}
	this.sound.togglePlay();
};

Audio.prototype.stop = function(){
	this.sound.stop();
	this.playing =  false;
};

Audio.prototype.play = function(){
	this.sound.play();
};

Audio.prototype.pause = function(){
	this.sound.pause();
};

Audio.prototype.setSeconds = function(seconds){
	this.sound.setTime(seconds);
};

Audio.prototype.getSeconds = function(){
	return this.sound.getTime();
};

Audio.prototype.getDurationSeconds = function(){
	return this.sound.getDuration();
};
