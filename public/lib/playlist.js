
var PlayList = function(options){
	this.options = options;
	this.list = [];
	this.songCache = {};
	this.listeners = {};
	this.index = -1;
	this.currentSong;
	this.loading = false;
	this.loadloop = false;
	this.randomize = options.getOption("randomized") || false;
	this.randomList = [];
	this.randomListPlayed = [];
	this.retries = 0;
	this.audio = new Audio();
	this.audio.addListener(this.eventTypes, this.eventListener, this);
	var vol = options.getOption("volumelevel");
	this.volumelevel = vol;
	this.savedTimes = storage.get("savedtimes");
	this.restoreSongs();
	this.randomize && this.randomizeList();
};

PlayList.prototype.eventTypes = [
	"ended",
	"play",
	"pause",
	"progress",
	"durationchange",
	"suspend",
	"timeupdate",
	"abort",
	"error",
	"emptied",
	"loadedmetadata"
];

PlayList.prototype.getSong = function(uuid){
	return this.songCache[uuid];
};

PlayList.prototype.getSongByIndex = function(index){
	return this.songCache[this.list[index]];
};

PlayList.prototype.setSong = function(uuid, songItem){
	this.songCache[uuid] = songItem;
};

PlayList.prototype.deleteSong = function(uuid, songItem){
	delete this.songCache[uuid];
};

PlayList.prototype.getSongByID = function(id){
	for(var i in this.songCache){
		var song = this.getSong(i);
		if(song.id == id){
			return song;
		}
	}
};

PlayList.prototype.getVolume = function(){
	return this.volumelevel;
};

PlayList.prototype.setVolume = function(value){
	this.volumelevel = value;
	this.options.setOption("volumelevel", value);
	this.audio.setVolume(value);
};

PlayList.prototype.setPercent = function(value){
	this.audio.setPercent(value);
}

PlayList.prototype.setPercentUp = function(value){
	var p = this.audio.getPercent();
	if(p){
		this.audio.setPercent(Math.round(p) + value)
	}
}

PlayList.prototype.setPercentDown = function(value){
	var p = this.audio.getPercent();
	if(p){
		this.audio.setPercent(Math.round(p) - value)
	}
}

PlayList.prototype.getIndex = function(uuid){
	return this.list.indexOf(uuid);
};

PlayList.prototype.getNextRandomSong = function(){
	var nextUuid = this.randomList.shift();
	if(!nextUuid){
		return null;
	}
	if(this.currentSong){
		this.randomListPlayed.unshift(this.currentSong.uuid);
	}
	return this.songCache[nextUuid];
};

PlayList.prototype.getPrevRandomSong = function(){
	var prevUuid = this.randomListPlayed.shift();
	if(!prevUuid){
		return null;
	}
	if(this.currentSong){
		this.randomList.unshift(this.currentSong.uuid);
	}
	return this.songCache[prevUuid];
};

PlayList.prototype.songCount = function(){
	var count = 0;
	for(var i = 0, l = this.list.length; i < l; ++i){
		var song = this.getSongByIndex(i);
		if(!song.locked){
			++count;
		}
	}
	return count;
};

PlayList.prototype.lockedSongCount = function(){
	var count = 0;
	for(var i = 0, l = this.list.length; i < l; ++i){
		var song = this.getSongByIndex(i);
		if(song.locked){
			++count;
		}
	}
	return count;
};

PlayList.prototype.createSongItem = function(data) {
	var songItem = new Song(data);
	if(this.savedTimes[songItem.id]){
		songItem.time = this.savedTimes[songItem.id];
	}
	this.setSong(songItem.uuid, songItem);
	return songItem;
};

PlayList.prototype.storeCurrentSong = function(){
	if(this.currentSong){
		var time = this.audio.getSeconds();
		if(time == this.audio.getDurationSeconds()){
			time = 0;
		}
		this.currentSong.time = time;
		storage.setCurrentSong(
			this.currentSong.uuid,
			this.currentSong.id, 
			time,
			this.index,
			this.audio.isPlaying()
		);
		if(this.currentSong.audiobook){
			if(time === 0){
				delete this.savedTimes[this.currentSong.id];
			}else{
				this.savedTimes[this.currentSong.id] = time;
			}
			storage.setSongTimes(
				this.savedTimes
			);
		}
	}
};

PlayList.prototype.executeListener = function(listeners, event, data) {
	if (listeners && listeners.length) {
		for ( var i = 0, l = listeners.length; i < l; ++i) {
			if (listeners[i].object) {
				listeners[i].func.apply(listeners[i].object,
						[ event, data ]);
			} else {
				listeners[i].func(event, data);
			}
		}
	}
};

PlayList.prototype.eventListener = function(event, data) {
	debug && console.log("PlayList: ", event.type);

	var songUuid;
	if(data && data.songId){
		songUuid = data.songId;
	} 
	
	switch (event.type) {
		case "ended":
			this.playNext();
			break;
		case "pause":
			this.storeCurrentSong();
			break;
		case "durationchange":
		case "suspend":
		case "progress":
			this.executeListener(
				this.listeners["downloaded"], 
				$.Event("downloaded"),
				this.audio.getDownloadProgress()
			);
			break;
		case "timeupdate":
			this.executeListener(
				this.listeners["playprogress"],
				$.Event("playprogress"),
				this.audio.getPlayProgress()
			);
			this.executeListener(
				this.listeners["currenttime"],
				$.Event("currenttime"),
				this.audio.getPlayTime()
			);
			this.storeCurrentSong();
			break;
		case "loadedmetadata":
			this.executeListener(
				this.listeners["metadataloaded"],
				$.Event("metadataloaded"),
				{"duration": data.getDuration(),
				"song": this.getSong(songUuid)}
			);
			break;
		case "error":
			this.retryPlay();
			break;
	}
	
	this.executeListener(
		this.listeners[event.type],
		event,
		songUuid && this.getSong(songUuid)
	);
};

PlayList.prototype.addListener = function(events, func, object) {
	if (typeof events == "string") {
		events = [ events ];
	}
	for ( var i = 0, l = events.length; i < l; ++i) {
		var event = events[i];
		if (!this.listeners[event]) {
			this.listeners[event] = [];
		}
		this.listeners[event].push({
			"object" : object,
			"func" : func
		});
	}
};

PlayList.prototype.randomizeList = function(){
	this.randomize = true;
	this.options.setOption("randomized", true);
	var randomList = this.list.slice();
	var i = randomList.length;
	while(i !== 0){
		var r = Math.floor(Math.random() * i);
		--i;
		var t = randomList[i];
		randomList[i] = randomList[r];
		randomList[r] = t;
	}
	if(this.currentSong){
		var cUuid = this.currentSong.uuid
		randomList = randomList.filter(function(uuid){
			if(cUuid == uuid){
				return false;
			}
			return true;
		});
	}
	this.randomList = randomList;
	this.randomListPlayed = [];
};

PlayList.prototype.unrandomize = function(){
	if(this.currentSong){
		this.index = this.getIndex(this.currentSong.uuid);
	}
	options.setOption("randomized", false);
	this.randomize = false;
};

PlayList.prototype.adjustOrder = function(previousIndex, newIndex) {
	this.list.splice(
		newIndex, 0, 
		this.list.splice(previousIndex, 1)[0]
	);
	if(previousIndex > this.index && newIndex <= this.index){
		++this.index;
	}else if(previousIndex < this.index && newIndex >= this.index){
		--this.index;
	}else if(previousIndex === this.index){
		this.index = newIndex;
	}
	this.saveList();
};

PlayList.prototype.addSongToEnd = function(data) {
	var songItem = this.createSongItem(data);
	this.list.push(songItem.uuid);
	this.addRandomSong(songItem.uuid);
	this.saveList();
};

PlayList.prototype.addSongNext = function(data) {
	var songItem = this.createSongItem(data);
	var index = this.index + 1;
	if(this.randomize && this.currentSong){
		index = this.getIndex(this.currentSong.uuid) + 1;
	}
	this.list.splice(index, 0, songItem.uuid);
	this.addRandomSong(songItem.uuid, true);
	this.saveList();
};

PlayList.prototype.addRandomSong = function(uuid, playNextSong) {
	if(!this.randomize){
		return;
	}
	var position = playNextSong ? 0 : Math.floor(Math.random() * this.randomList.length);
	this.randomList.splice(position, 0, uuid);
};

PlayList.prototype.addAndPlaySong = function(data) {
	if (!this.currentSong) {
		this.addSongNext(data);
	} else {
		var songItem = this.createSongItem(data);
		this.list.splice(this.index + 1, 0, songItem.uuid);
		this.addRandomSong(songItem.uuid);
	}
	this.playNext();
	this.saveList();
};

PlayList.prototype.addSongsFromArray = function(songArray) {
	var firstSong;
	for(var i = 0, l = songArray.length; i < l; ++i) {
		var songItem = this.createSongItem(songArray[i]);
		this.list.push(songItem.uuid);
		this.addRandomSong(songItem.uuid);
	}
	if(!this.currentSong){
		this.playNext();
	}
	this.saveList();
};

PlayList.prototype.getNextSong = function(index, uuid){
	if(this.randomize){
		var song = this.getNextRandomSong();
		if(!song){
			return false;
		}
		if(this.currentSong){
			this.currentSong.stopPlayUI();
			this.currentSong.notCurrentUI();
		}
		this.currentSong = song;
		return true;
	}
	if(index != undefined || index != null){
		if(index == -1 && this.list.length){
			index = 0;
		}
		var song = this.getSongByIndex(index);
		if(this.currentSong && song.uuid == this.currentSong.uuid){
			return false;
		}
		if(this.currentSong){
			this.currentSong.stopPlayUI();
			this.currentSong.notCurrentUI();
		}
		this.currentSong = song;
		return true;
	}
	if(uuid){
		var song = this.getSong(uuid);
		if(this.currentSong && song.uuid == this.currentSong.uuid){
			return false;
		}
		if(this.currentSong){
			this.currentSong.stopPlayUI();
			this.currentSong.notCurrentUI();
		}
		this.currentSong = song;
		return true;
	}
};

PlayList.prototype.getPrevSong = function(index, uuid){
	if(this.randomize){
		var song = this.getPrevRandomSong();
		if(!song){
			return false
		}
		if(this.currentSong){
			this.currentSong.stopPlayUI();
			this.currentSong.notCurrentUI();
		}
		this.currentSong = song
		return true;
	}
	return this.getNextSong(index, uuid);
};

PlayList.prototype.loadSong = function(song){
	this.currentSong = this.getSong(song.uuid);
	this.index = this.getIndex(song.uuid);
	this.audio.setSrc(this.currentSong);
	this.audio.load();
};

PlayList.prototype.playSong = function(song) {
	if(this.currentSong){
		this.currentSong.stopPlayUI();
		this.currentSong.notCurrentUI();
	}
	if(this.currentSong && song.uuid != this.currentSong.uuid){
		this.currentSong = this.getSong(song.uuid);
		this.index = this.getIndex(song.uuid);
	}
	if(song && !this.currentSong){
		this.getNextSong(null, song.uuid);
		this.index = this.getIndex(song.uuid);
	}
	this.togglePlay();
};

PlayList.prototype.togglePlay = function(){
	if (!this.currentSong) {
		this.getNextSong(this.index);
	}

	if (!this.currentSong) {
		return false;
	}

	this.audio.setSrc(this.currentSong);
	this.audio.setVolume(this.volumelevel);
	this.audio.togglePlay(this.currentSong.time);
	this.storeCurrentSong();
};

PlayList.prototype.restartSong = function(){
	if (!this.currentSong){
		return false;
	}

	this.audio.stop();
	this.audio.play();
};

PlayList.prototype.retryPlay = function(){
	if(this.retries < 5){
		++this.retries;
		var self = this;
		setTimeout(function(){
			self.togglePlay();
		},3000);
	}else{
		this.retries = 0;
	}
};

PlayList.prototype.clearList = function(){
	this.haltPlay();
	var newList = [];
	for(var i = 0, l = this.list.length; i < l; ++i){
		var song = this.getSongByIndex(i);
		if(song.locked){
			newList.push(this.list[i]);
		}else{
			this.deleteSong(this.list[i]);
		}
	}
	this.list = newList;
	if(!this.list.length){
		this.index = -1;
	}
	this.saveList();
	if(this.randomize){
		this.randomizeList();
	}
};

PlayList.prototype.removeSong = function(song){
	if(this.currentSong &&	this.currentSong.uuid == song.uuid){
		if(this.index === this.list.length - 1){
			this.haltPlay();
		}
		if(this.audio.isPlaying()){
			this.playNext();
		}
	}
	this.deleteSong(song.uuid);
	var index = this.getIndex(song.uuid);
	this.list.splice(index, 1);
	if(index < this.index){
		--this.index;
	}
	if(this.list.length == 0){
		this.eventListener(
			$.Event("songscleared")
		);
	}
	this.saveList();
	if(this.randomize){
		var randindex = this.randomList.indexOf(song.uuid);
		if(randindex > -1){
			this.randomList.splice(randindex, 1);
		}
		var randindex = this.randomListPlayed.indexOf(song.uuid);
		if(randindex > -1){
			this.randomListPlayed.splice(randindex, 1);
		}
	}
};

PlayList.prototype.abortPlayAndRemove = function(uuid){
	this.index--;
	var song = this.getSong(uuid);
	if(song){
		song.remove();
	}
	this.playNext();
};

PlayList.prototype.playNext = function(){
	if(!this.list.length)
		return;

	++this.index;

	if(this.index > this.list.length - 1){
		this.index = this.list.length - 1;
		if(this.index == -1){
			return;
		}
	}

	var success = this.getNextSong(this.index);
	if(!success){
		return;
	}
	
	this.togglePlay();
};

PlayList.prototype.playPrevious = function(){
	if(!this.list.length)
		return;
	
	--this.index;
	
	if(this.index < 0){
		if(this.list.length){
			this.index = 0;
		}else{
			this.index = -1;
		}
		return;
	}

	var success = this.getPrevSong(this.index);
	if(!success){
		return;
	}
	
	this.togglePlay();
};

PlayList.prototype.haltPlay = function(){
	if (this.currentSong) {
		this.audio.stop();
		this.currentSong = null;
	}
	this.eventListener(
		$.Event("songscleared")
	);
};

PlayList.prototype.saveList = function(){
	storage.setStoredSongs(this.list, this.songCache);
};

PlayList.prototype.restoreSongs = function(){
	var songlistRaw = storage.getStoredSongs();
	if(!songlistRaw)
		return;
	for(var i = 0, l = songlistRaw.length; i < l; ++i){
		var songItem = this.createSongItem(songlistRaw[i]);
		this.list.push(songItem.uuid);
	}
	if(this.list.length)
		this.index = 0;
	var currentSongRaw = storage.getCurrentSong();
	if(currentSongRaw){
		this.currentSong = this.getSongByID(currentSongRaw.id);
		if(this.currentSong){
			if(currentSongRaw.playing){
				this.playSong(this.currentSong);
			 }else{
				this.loadSong(this.currentSong);
			}
			this.audio.setSeconds(currentSongRaw.time);
			this.index = currentSongRaw.index;
		}
	}
};

PlayList.prototype.getPlaylists = function(callback){
	var ts = new Date().getTime();
	ajaxWithOpts("/songs/playlists?_=" + ts, "GET", null, {}, null, function(data){
		if(data && data.result != "ok"){
			return callback(data);
		}
		
		callback(null, data.playlists);
	});
};

PlayList.prototype.makePlaylist = function(playlistName, callback){
	var playList = [];
	var ts = new Date().getTime();
	for(var i = 0, l = this.list.length; i < l; ++i){
		var songItem = this.getSongByIndex(i);
		playList.push({
			"name": (songItem.title || songItem.name) + " : " + songItem.artist + " : " + songItem.album,
			"type": songItem.type,
			"path": songItem.dir
		});
	}

	ajaxWithOpts("/songs/playlist?_=" + ts, "POST", {"list": playList, "name": playlistName}, {}, null, function(data){
		if(data && data.result != "ok"){
			return callback(data);
		}
		callback(null, data.playlists);
	});
};


PlayList.prototype.refreshPlaylist = function(callback){
	var ts = new Date().getTime();
	ajaxWithOpts("/songs/refreshplaylists?_=" + ts, "GET", null, {}, null, function(data){
		if(data && data.result != "ok"){
			return callback(data);
		}
		callback(null, data.playlists);
	});
};

PlayList.prototype.removePlaylist = function(playlistName, callback){
	var ts = new Date().getTime();
	ajaxWithOpts("/songs/removeplaylist/" + playlistName + "?_=" + ts, "GET", null, {}, null, function(data){
		if(data && data.result != "ok"){
			return callback(data);
		}
		callback(null, data.playlists);
	});
};
