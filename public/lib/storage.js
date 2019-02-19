

var OptionStorage = function(){
	this.enabled = typeof(Storage) !== "undefined";
	if(!this.enabled){
		return false;
	}
	this.options = storage.get("options");
};

OptionStorage.prototype.getOption = function(optName){
	if(!optName){
		return this.options;
	}
	return this.options[optName];
};

OptionStorage.prototype.setOption = function(optName, value){
	if(!optName){
		return;
	}
	this.options[optName] = value;
	this.saveOptions();
};

OptionStorage.prototype.saveOptions = function(){
	storage.set("options", this.options);
};

var SongStorage = function(username, service){
	this.enabled = typeof(Storage) !== "undefined";
	if(!this.enabled)
		return false;
	
	this.storage;
	this.username = username;
	this.service = service;
};

SongStorage.prototype.init = function(callback){
	this.storage = new ServiceStorage(this.username, this.service);
	this.storage.init(callback);
};

SongStorage.prototype.saveRemote = function(){
	this.storage.saveRemoteStorage();
};

SongStorage.prototype.get = function(key){
	return this.storage.getOption(key) || {};
};

SongStorage.prototype.set = function(key, value){
	this.storage.setOption(key, value);
};

SongStorage.prototype.getStoredSongs = function(name){
	if(!name){
		name = "__currentplaylist";
	}
	var playlists = this.get("playlists");
	return playlists[name];
};

SongStorage.prototype.setStoredSongs = function(list, cache, name){
	if(!name){
		name = "__currentplaylist";
	}
	
	var listStorage = this.prepList(list, cache);
	var playlists = this.get("playlists");
	playlists[name] = listStorage;
	this.set("playlists", playlists);
};

SongStorage.prototype.prepList = function(list, cache){
	var listStorage = [];
	
	for(var i = 0, l = list.length; i < l; ++i){
		var song = cache[list[i]];
		listStorage.push({
			"album": song.album,
			"artist": song.artist,
			"dir": song.dir,
			"id": song.id,
			"image": song.image,
			"name": song.name,
			"title": song.title,
			"locked": song.locked,
			"type": song.type,
			"uuid": song.uuid
		});
	}
	
	return listStorage;
};

SongStorage.prototype.getCurrentSong = function(){
	if(!this.enabled)
		return false;
	return this.get("currentsong");
};

SongStorage.prototype.setCurrentSong = function(uuid, songId, time, currentIndex, playing){
	if(!this.enabled)
		return false;
	this.set("currentsong", {
		"uuid": uuid,
		"id": songId,
		"time": time,
		"index": currentIndex,
		"playing": playing
	});
};

SongStorage.prototype.setSongTimes = function(setTimes){
	if(!this.enabled)
		return false;
	this.set("savedtimes", setTimes);
};