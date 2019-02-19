/*
TODO
	1) Add ID3 stripping
 */

var fs = require("fs");
var id3 = require('id3js');
var async = require('async');
var process = require('child_process');
var helpers = require("../../utils/helpers.js");

var soundfiletypes = {"mp3":1, "m4a":1};
var imagefiletypes = {"jpg":1, "jpeg":1, "png":1};

var service = "songs";
var publicBaseDir = "/files";
var publicImageDir = "/images";

exports.publicBaseDir = publicBaseDir;
exports.publicImageDir = publicImageDir;
exports.mixesPath = mixesPath;
exports.files = {};
exports.searchCache = [];
exports.musicDir;
exports.logFile;
exports.port;

var mixesPath = exports.mixesPath + "/Mixes";
var playlists = {};

exports.set = function(settingObject){
	for(var i in settingObject){
		exports[i] = settingObject[i];
	}
	exports.logFile = service + exports.port + ".log";
};

exports.searchSongs = function(searchString, callback){
	var maxResults = 100;
	var results = {
		"counts": {
			"artist": 0,
			"album": 0,
			"title": 0
		},
		"artist": {},
		"album": {},
		"title": {}
	};
	var self = this;
	async.each(
		this.searchCache, 
		function(cacheItem, callback){
			
			//check Max hits
			if(results.counts.artist >= maxResults &&
				results.counts.album >= maxResults &&
				results.counts.title >= maxResults){
				callback(true);
			}
			
			//if part of string matches search string
			var searchItem = cacheItem.replace(self.musicDir,"");
			if(searchItem.toLowerCase().search(searchString.toLowerCase()) > -1){
				return async.waterfall([
					 	function(callback){
					 		fs.stat(cacheItem, callback);
					 	},
					 	function(stat, callback){
					 		var pathParts = searchItem.split("/");
					 		
					 		//if directory, then its an artist or an album
					 		if (stat && stat.isDirectory()) {
					 			
					 			//if there are only 2 parts, its an artist
					 			if(pathParts.length == 2){
					 				
					 				//check max artists
					 				if(results.counts.artist >= maxResults){
					 					return callback();
			 						}
					 				
					 				//store in key array to avoid dupes
					 				if(!results.artist[pathParts[1].toLowerCase()]){
					 					results.artist[pathParts[1].toLowerCase()] = {
					 						"name": pathParts[1],
					 						"dir": cacheItem.replace(self.musicDir, self.publicBaseDir),
					 						"type": "artist"
					 					};
					 					++results.counts.artist;
					 				}
					 				return callback();
					 			}
					 			
					 			//check max albums
					 			if(results.counts.album >= maxResults){
				 					return callback();
		 						}
					 			
					 			//loop though rest of parts of album
					 			for(var i = 2, l = pathParts.length; i < l; ++i){
					 				if(pathParts[i].toLowerCase().search(searchString.toLowerCase()) > -1){
						 				
					 					//store in key array to avoid dupes
						 				if(!results.album[pathParts[i].toLowerCase()]){
							 				results.album[pathParts[i].toLowerCase()] = {
							 					"name": pathParts[i],
						 						"dir": cacheItem.replace(self.musicDir, self.publicBaseDir),
						 						"type": "album"
						 					};
						 					++results.counts.album;
						 				}
						 				return callback();
					 				}
					 			}
					 		}
					 		
					 		//if its a file, this is a title
					 		if (stat && stat.isFile()) {
					 			
					 			//check max title count
					 			if(results.counts.title >= maxResults){
				 					return callback();
		 						}
					 			
					 			//get file name
					 			var filePart = pathParts[pathParts.length -1];
					 			
					 			//if its a valid type of file and has search string in it
					 			if(searchFiletypesRegEx(filePart, soundfiletypes) > -1 && filePart.toLowerCase().search(searchString.toLowerCase()) > -1){
					 				//get id3 info
					 				
					 				var item = {
				 						"dir": cacheItem.replace(self.musicDir, self.publicBaseDir),
				 						"filetype": matchFiletypesRegEx(filePart, soundfiletypes),
				 						"name": filePart,
				 						"type": "song"
				 					};
					 				
					 				return buildId3Info(cacheItem, item, function(error){
					 					if (error) {
					 						return callback(error);
					 					}
					 					
					 					results.title[filePart.toLowerCase()] = item;
				 						++results.counts.title;
					 					
					 					callback();
					 				});
					 			}
					 		}
					 		callback();
					 	}
					],
					callback
				);
			}
			callback();
		}, 
		function(error){
			if(error && typeof error == "object")
				return callback(error);

			var finalResults = {
				"counts": results.counts,
				"artist": Object.keys(results.artist).map(function(item){
					return results.artist[item];
				}),
				"album": Object.keys(results.album).map(function(item){
					return results.album[item];
				}),
				"title": Object.keys(results.title).map(function(item){
					return results.title[item];
				})
			};
			
			callback(null, finalResults);
		}
	);
};

exports.getfiles = function getFiles(dir, callback){
	var self = this;
	var firstPass = false;
	if(!dir){
		dir = this.musicDir;
		firstPass = true;
	}
	if(this.files[dir]){
		return callback(null, this.files[dir]);
	}

	var _path = dir.replace(this.publicBaseDir, this.musicDir);
	self.walk(firstPass, _path + "/", function(error, files){
		if(error)
			return callback(error);

		files.songs.sort(function(a, b){
			
			if(a.type == "artist" || b.type == "artist"){
				if(a.type == "artist" && b.type != "artist")
					return -1;
				if(a.type != "artist" && b.type == "artist")
					return 1;
			}
			
			if(a.type == "album" || b.type == "album"){
				if(a.type == "album" && b.type != "album")
					return -1;
				if(a.type != "album" && b.type == "album")
					return 1;
			}
			
			if(a.info && b.info){
				if(a.info.track && b.info.track){
					if (parseInt(a.info.track, 10) > parseInt(b.info.track, 10))
						return 1;
					if (parseInt(b.info.track, 10) > parseInt(a.info.track, 10))
						return -1;
				}
				if(a.info.title && b.info.title){
					var sortRes = naturalSortFunc(a.info.title, b.info.title);
					if(sortRes){
						return sortRes;
					}
				}
			}

			return naturalSortFunc(a.name, b.name);
		});
		
		self.files[dir] = files;
		callback(null, files);
	});
};

var naturalSortFunc = function(a, b) {
	function chunkify(t) {
		var tz = [], x = 0, y = -1, n = 0, i, j;

		while (i = (j = t.charAt(x++)).charCodeAt(0)) {
			var m = (i == 46 || (i >=48 && i <= 57));
			if (m !== n) {
				tz[++y] = "";
				n = m;
			}
			tz[y] += j;
		}
		return tz;
	}

	var aa = chunkify(a.toLowerCase());
	var bb = chunkify(b.toLowerCase());

	for (x = 0; aa[x] && bb[x]; x++) {
		if (aa[x] !== bb[x]) {
			var c = Number(aa[x]), d = Number(bb[x]);
			if (c == aa[x] && d == bb[x]) {
				return c - d;
			} else return (aa[x] > bb[x]) ? 1 : -1;
		}
	}

	return aa.length - bb.length;
};

exports.getPlaylist = function(username, id, callback){
	if(playlists[username] && playlists[username][id]){
		return callback(null, playlists[username][id].songs);
	}
	callback(null, []);
};

var convertSeconds = function(sec){
	var hours = Math.floor(sec / 3600);
	var min = Math.floor((sec - (hours*3600)) / 60);
	var seconds = Math.floor(sec % 60);
	if(hours < 10){
		hours = "0" + hours;
	}
	if(min < 10){
		min = "0" + min;
	}
	if(seconds < 10){
		seconds = "0" + seconds;
	}
	if(isNaN(hours) || isNaN(min) || isNaN(seconds)){
		return null;
	}
	return hours + ":" + min + ":" + seconds;
};

exports.getPlaylists = function(username, callback){
	if(playlists[username]){
		return callback(null, playlists[username]);
	}
	
	//this.buildMixes(username, function(error){
		//if (error){
		//	return callback(error);
		//}
		
		callback(null, playlists[username]);
	//});
};

exports.buildMixes = function(username, callback){
	if(!playlists[username]){
		playlists[username] = {};
	}
	recurseMixes(username, this.mixesPath, this.musicDir, function(error){
		if (error){
			return callback(error);
		}
		
		callback();
	});
};

exports.getPlaylistNames = function(username, callback){
	this.getPlaylists(username, function(error, userplaylists){
		if (error){
			return callback(error);
		}

		var pl = [];
		for(var i in userplaylists){
			pl.push({
				"id": i,
				"name": userplaylists[i].name,
				"time": convertSeconds(userplaylists[i].time),
				"type": "playlist",
				"public": userplaylists[i]["public"]
			});
		}
		
		pl.sort(function(a, b){
			if (a.name > b.name)
				return 1;
			if (b.name > a.name)
				return -1;
		});
		
		callback(null, pl);
	});
};

exports.deleteMix = function(username, id, callback){
	if(playlists[username] && playlists[username][id]){
		var mix = playlists[username][id];
		if(mix["public"] === false && mix.path.length){
			return fs.unlink(mix.path, function(error){
				if (error){
					return callback(error);
				}
				
				delete playlists[username][id];
				callback(null, playlists);
			});
		}
	}
	callback(null, playlists);
};

var recurseMixes = function(username, mixPath, musicDir, callback){
	fs.readdir(mixPath, function(error, mixList){
		if (error){
			return callback(error);
		}

		if(!mixList.length){
			return callback();
		}
		
		async.eachSeries(mixList, 
			function(listItem, callback){
				if(playlists[username] && playlists[username][listItem]){
					return callback();
				}
				var path = mixPath + "/" + listItem;
				var listObject;
				async.waterfall(
					[
					 	function(callback){
					 		fs.stat(path, callback);
					 	},
					 	function(stat, callback){
					 		if (stat && stat.isFile()){
					 			
					 			listObject = {
					 				"id": listItem,
					 				"path": path,
					 				"public": mixesPath == mixPath,
					 				"songs": [],
					 				"images": []
					 			};
					 			
					 			return readMixFile(listObject, musicDir, function(error){
					 				if(error){
					 					return callback(error);
					 				}
					 				
					 				playlists[username][listItem] = listObject;
					 				callback();
					 			});
					 		}
//					 		if (stat && stat.isDirectory() && listItem == username){
//					 			return recurseMixes(username, path, musicDir, callback);
//					 		}
					 		callback();
					 	},
					 	function(callback){
							if(error){
								return callback(error);
							}
							
					 		if(!listObject){
					 			return callback();
					 		}
					 		
					 		locateMixAssets(listObject, musicDir, callback);
						}
					],
					callback
				);
			}, 
			callback
		);
	});
};

var readMixFile = function(listObject, musicDir, callback){
	fs.readFile(listObject.path, function(error, data){
		if(error){
			return callback(error);
		}
		var dataContent = data.toString().split("\n");

		for(var i = 0, l = dataContent.length; i < l; ++i){
			if(dataContent[i].search("#EXTM3U ") === 0){
				var JSONstring = dataContent[i].replace("#EXTM3U ", "");
				var JSONinfo;
				try{
					JSONinfo = JSON.parse(JSONstring);
				}catch(e){
					helpers.recordLog(e, exports.logFile);
				}
				if(JSONinfo){
					listObject.name = JSONinfo.name;
					listObject.time = JSONinfo.time;
				}
				if(!JSONinfo){
					listObject.name = listItem;
					listObject.time = 0;
				}
			}
			if(dataContent[i].search("#EXTINF: ") === 0){
				var songInfoString = dataContent[i].replace("#EXTINF: ", "");
				var time = convertSeconds(parseInt(songInfoString.match(/\d*/)[0]));
				var songLine = songInfoString.match(/, .*/)[0].replace(/^, /, "");
				var songParts = songLine.split(" : ");
				var item = {
					"dir": dataContent[i + 1].replace(musicDir, publicBaseDir),
					"filetype": matchFiletypesRegEx(dataContent[i + 1], soundfiletypes),
					"name": songParts[0],
					"type": "song",
					"time": time
				};
				listObject.songs.push(item);
			}
		}
		callback();
	});
};

var locateMixAssets = function(listObject, musicDir, callback){
	var trackNumber = 0;
	var songList = listObject.songs;
	async.eachSeries(
		songList, 
		function(item, callback){
			var systemFile = item.dir.replace(publicBaseDir, musicDir);
			async.waterfall([
			 	function(callback){
			 		fs.stat(systemFile, function(error, stat){
			 			if(error){
			 				if(error.errno == -2){
			 					item.invalid = true;
			 					return callback(null, false);
			 				}
			 				return callback(error);
			 			}
			 			callback(null, stat);
			 		});
			 	},
			 	function(stat, callback){
			 		if(!stat){
			 			return callback();
			 		}
			 		
		 			var fileSplit = systemFile.split(".");
		 			var filetype = fileSplit[fileSplit.length - 1].toLowerCase();
		 			if (soundfiletypes[filetype]){
				 		return buildId3Info(systemFile, item, function(error){
		 					if (error) {
		 						return callback(error);
		 					}
		
		 					item.info.track = ++trackNumber;
		 					callback();
		 				});
		 			}
		 			
		 			//put in images
			 	}], 
			 callback)
		}, 
		function(error){
			if(error){
				return callback(error);
			}
			
			listObject.songs = songList.filter(function(item){
				return !item.invalid;
			});
			
			callback(null, listObject);
		}
	);
};

exports.walk = function walk(firstPass, dir, callback) {
	var results = [];
	var caller = this;
	fs.readdir(dir, function(error, list) {
		if (error) 
			return callback(error);
		
		var allSoundFiles = [];
		var allImageFiles = [];

		if(!list.length)
			return callback(null, allSoundFiles);
		
		var lastDitchOrder = 1;
		
		async.eachSeries(list,
			function(file, callback) {
				if(file == "Mixes"){
					return callback();
				}
				var systemFile = dir + file;
				var item = {
					"name": file
				};
				if(firstPass && file != "/Audio Books"){
					item.artist = file;
				}
				if(dir.search("Audio Books") > -1){
					//works??
					item.artist = file;
				}
				async.waterfall(
					[
					 	function(callback){
					 		fs.stat(systemFile, callback);
					 	},
					 	function(stat, callback){
					 		if (stat && stat.isFile()) {
					 			
					 			var fileSplit = file.split(".");
					 			var filetype = fileSplit[fileSplit.length - 1].toLowerCase();
					 			if (soundfiletypes[filetype]){
					 				
					 				item.filetype = filetype;
					 				item.type = "song";
					 				item.dir = dir.replace(caller.musicDir, publicBaseDir) + file;
					 				allSoundFiles.push(item);
					 				
					 				return buildId3Info(systemFile, item, function(error){
					 					if (error) {
					 						return callback(error);
					 					}

					 					if(item.info && !item.info.track){
											item.info.track = lastDitchOrder;
											++lastDitchOrder;
										}
					 					
					 					callback();
					 				});
					 			}
					 			if (imagefiletypes[filetype]){
					 				item.filetype = filetype;
					 				item.size = stat.size;
					 				item.type = "image";
					 				item.dir = dir.replace(caller.musicDir, publicImageDir) + file;
					 				allImageFiles.push(item);
					 			}
					 		}
					 		if (stat && stat.isDirectory()) {
					 			lastDitchOrder = 1;
					 			item.type = firstPass ? "artist" : "album";
					 			item.title = item.name.replace(/\_/g, " ");
					 			item.dir = dir.replace(caller.musicDir, publicBaseDir) + file;
					 			allSoundFiles.push(item);
					 		}
					 		callback();
					 	}
					 ],
					 callback
				);
			},
			function(error) {
				if(error)
					return callback(error);

				
				if(allImageFiles.length){
					var imagePath;
					var imageSize = 0;
					for(var i = 0, l = allImageFiles.length; i < l; ++i){
						if(allImageFiles[i].size > imageSize){
							imageSize = allImageFiles[i].size;
							imagePath = allImageFiles[i].dir;
						}
					}
					if(imagePath){
						for(var i = 0, l = allSoundFiles.length; i < l; ++i){
							allSoundFiles[i].image = imagePath;
						}
					}
				}
				
				callback(null, {
					"songs": allSoundFiles,
					"images": allImageFiles
				});
			}
		);
	});
};

var fillInDetails = function(item){
	var infoSplit = item.dir.replace(publicBaseDir, "").split("/").filter(String);

	var title = infoSplit.pop();
	if(!item.info.title){
		item.info.title = title.replace(/\_/g, " ");
		if(item.filetype){
			item.info.title = item.info.title.replace(new RegExp("\." + item.filetype + "$"), "");
		}
	}
	
	var artist = infoSplit.shift();
	if(artist == "Audio Books"){
		artist =  infoSplit.shift();
	}
	if(!item.info.artist){
		item.info.artist = artist;
	}
	
	var album = infoSplit.join(" - ");
	if(!item.info.album){
		item.info.album = album;
	}
};

var testExtChar = function(str){
	if(!str.length){
		return true;
	}
	for(var i = 0, l = str.length; i < l; ++i){
		var cc = str.charCodeAt(i);
		if(cc != 32 && (cc === 63 || cc <= 34 || cc >= 65533)){
			return true;
		}
	}
};

var stripNulls = function(string){
	return string.trim().replace(/[\0\"]/g, "");
};

var fillTags = function(tags, item, skipTest){
	if(!tags){
		return;
	}
	if(tags.artist && !item.info.artist){
		var artist = stripNulls(tags.artist);
		if(skipTest || !testExtChar(artist)){
			item.info.artist = artist;
		}
	}
	if(tags.album && !item.info.album){
		var album = stripNulls(tags.album);
		if(skipTest || !testExtChar(album)){
			item.info.album = album;
		}
	}
	if(tags.title && !item.info.title){
		var title = stripNulls(tags.title);
		if(skipTest || !testExtChar(title)){
			item.info.title = title;
		}
	}
	if(tags.track && !item.info.track){
		item.info.track = stripNulls(tags.track + "");
		if((item.info.track + "").search(/\//) > -1){
			item.info.track = item.info.track.split("/")[0];
		}
	}
};

var buildId3Info = function(systemFile, item, callback){
	item.info = {};
	
	var _bid3ie = function(systemFile, item){
		buildId3InfoExtended(systemFile, function(error, _tags){
			fillTags(_tags, item, true);
			fillInDetails(item);
			callback();
		});
	};
	
	try{
		id3({
			"file": systemFile, 
			"type": id3.OPEN_LOCAL
		},
		function(error, tags) {
			if(error){
				helpers.recordLog(error, exports.logFile);
                return _bid3ie(systemFile, item);
			}
			
			fillTags(tags, item);
			fillTags(tags.v1, item);
			fillTags(tags.v2, item);
			if(!item.info.title || !item.info.artist || !item.info.album){
				return _bid3ie(systemFile, item);
			}
			
			fillInDetails(item);
			callback();
		});
	}catch(e){
		_bid3ie(systemFile, item);
	}
	
};

var buildId3InfoExtended = function(systemFile, callback){
	var id3Command = 'id3v2 -l "' + systemFile + '" ';
	process.exec(id3Command, function(error, stdout, stderr){
		if(error || stderr){
			return callback(error ? error : new Error(stderr));
		}
		
		var tags = {};
		if(!stdout){
			return callback(tags);
		}
		
		var stripOut = function(line){
			var ma = line.match(/: .*/);
			if(ma[0] && ma[0].replace(/: /, "")){
				return stripNulls(ma[0].replace(/: /, ""));
			}
		};
		
		var sA = stdout.split("\n");
		for(var i = 0, l = sA.length; i < l; ++i){
			if(sA[i].search(/TT2/) === 0 || sA[i].search(/TIT2/) === 0){				
				tags.title = stripOut(sA[i]);
			}
			if(sA[i].search(/TP1/) === 0 || sA[i].search(/TPE1/) === 0){
				tags.artist = stripOut(sA[i]);
			}
			if(sA[i].search(/TAL/) === 0 || sA[i].search(/TALB/) === 0){
				tags.album = stripOut(sA[i]);
			}
			if(sA[i].search(/TRK/) === 0 || sA[i].search(/TRCK/) === 0){
				tags.track = stripOut(sA[i]);
				if((tags.track + "").search(/\//) > -1){
					tags.track = tags.track.split("/")[0];
				}
			}
		}

		callback(null, tags);		
	});
};

exports.initSearch = function(){
	process.exec("find " + exports.musicDir + "/* ", {"maxBuffer": 1024 * 2000000}, function(error, data){
		if(error){
			return helpers.recordLog(error, exports.logFile);
		}
		
		exports.searchCache = data.split("\n");
	});
};

exports.exportPlaylist = function(list, mixName, username, callback){
	if(!list){
		return callback();
	}
	var self = this;
	for(var i = 0, l = list.length; i < l; ++i){
		//new RegExp("^\\" + publicBaseDir)
		list[i].path = list[i].path.replace(/^\/files/, this.musicDir);
	}
	
	var mixNameExt = mixName.replace(/[^a-zA-Z0-9]/g,"") + (new Date().getTime()) + ".m3u";
	var unPath = "";
	if(username){
		unPath = "/" + username;
	}
	var mixDirPath = self.mixesPath + unPath;
	var mixFile = mixDirPath + "/" + mixNameExt;

	var statDir = function(callback){
		fs.stat(mixDirPath, function(error, stats){
			if(error){
				if(error.errno == -2){
					return makeDir(callback);
				}
				return callback(error);
			}
			callback(null, stats);
		});
	};
	
	var makeDir = function(callback){
		fs.mkdir(mixDirPath, function(error){
			if(error){
				return callback(error);
			}
			
			statDir(callback);
		});
	};
	
	var fileLine = "";
	var totalTime = 0;
	async.waterfall([
			function(callback){
				statDir(callback);
			},
			function(stats, callback){
				async.eachSeries(list,
					function(song, callback){
						var getSeconds = 'mp3info -p "%S" "' + song.path + '"';
						process.exec(getSeconds, function(error, stdout, stderr){
							if(error || stderr){
								return callback(error ? error : new Error(stderr));
							}
							var time = stdout;
							var line = "#EXTINF: " + time + ", " + song.name + "\n";
							
							fileLine += line;
							fileLine += song.path + "\n";
							
							totalTime += parseInt(time, 10);

							callback();
						});
					}, 
					callback
				);
			},
			function(callback){
				var fd = fs.openSync(mixFile, "w");
				var header = {
					"name": mixName,
					"time": totalTime
				};
				var header = new Buffer("#EXTM3U " + JSON.stringify(header) + "\n");
				fs.writeSync(fd, header, 0, header.length, null);
				fs.writeSync(fd, fileLine);
				fs.close(fd, function(error){
					if(error){
						return callback(error);
					}
					
					callback();
				});
			}
		],
		function(error){
			if(error){
				return callback(error);
			}
			//self.buildMixes(username, function(error){
			//	if(error){
			//		return callback(error);
			//	}
				
				self.getPlaylistNames(username, callback);
			//});
		}
	);
};

var matchFiletypesRegEx = function(string, typeList){
	return string.toLowerCase().match(
		new RegExp(
			Object.keys(typeList).map(
				function(item){
					return item + "$";
				}
			).join("|"), "g"
		)
	)[0];
};

var searchFiletypesRegEx = function(string, typeList){
	return string.toLowerCase().search(
		new RegExp(
			Object.keys(typeList).map(
				function(item){
					return item + "$";
				}
			).join("|"), "g"
		)
	);
};

