
var Options = function(){
	this.optionStorage = new OptionStorage();
};

Options.defaults = {
	"volumelevel": 100
};

Options.allUserOptions = [
	{
		"title": "Enable lyrics search",
		"variable": "songinfosearch",
		"toggle": function(){
			options.setOption("songinfosearch", this.checked);
			toggleSongInfoSearch(this.checked);
		}
	},
	{
		"title": "Enable playlist saving",
		"variable": "playlistSaving",
		"toggle": function(){
			options.setOption("playlistSaving", this.checked);
			togglePlaylistSaving(this.checked);
		}
	},
	{
		"title": "Enable track locking",
		"variable": "trackLockingEnabled",
		"toggle": function(){
			options.setOption("trackLockingEnabled", this.checked);
			toggleLocking(this.checked);
		}
	}
];

Options.prototype.getOption = function(optName){
	var value = this.optionStorage.getOption(optName);
	if((value == undefined || value == null) && Options.defaults[optName] != undefined){
		value = Options.defaults[optName];
	}
	return value;
};

Options.prototype.setOption = function(optName, value){
	this.optionStorage.setOption(optName, value);
};

