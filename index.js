
var helpers = require("../utils/helpers.js");
var auth = require("../auth/auth.js");
var songs = require("./lib/songs.js");
var async = require("async");

module.exports = function(app, express, auth){
	var config = app.get("config");
	
	helpers.setServiceInfo(app, "songs", {
		"filedir": config.songs.musicDir
	});
	
	songs.set({
		"port": config.server.port,
		"musicDir": config.songs.musicDir
	});
	
	songs.initSearch();
	
	app.use("/public/songs", express.static(__dirname + "/public"));
	app.use("/public/songs/lib", express.static(__dirname + "/public/lib"));
	app.use("/public/songs/ext", express.static(__dirname + "/public/ext"));
	
	app.post("/songs/playlist", auth.log_1, auth.checkAuth, function(req, res){
		var list = helpers.getParam("list", req);
		var name = helpers.getParam("name", req) || "";
		var username = req.session.un;
		songs.exportPlaylist(list, name, username, function(error, playlists){
			if(error)
				return res.send({"result":"fail","error": error.message});
			
			res.send({"result": "ok", "playlists": playlists});
		});
	});
	
	app.post("/songs/get", auth.checkAuth, auth.log_1, function(req, res){
		var dir = helpers.getParam("dir", req);
		songs.getfiles(dir, function(error, files){
			if(error)
				return res.send({"result":"fail","error": error.message});
				
			res.send({"result":"ok","files": files});
		});
	});
	
	app.post("/songs/getplaylist", auth.log_1, auth.checkAuth, function(req, res){
		var id = helpers.getParam("id", req);
		var un = req.session.un;
		songs.getPlaylist(un, id, function(error, songs){
			if(error)
				return res.send({"result":"fail","error": error.message});
				
			res.send({"result":"ok","files": {
				"songs": songs,
				"images": []
			}});
		});
	});

	app.get("/songs/refreshplaylists", auth.log_1, auth.checkAuth, function(req, res){
		var username = req.session.un;
		songs.buildMixes(username, function(error, playlists){
			if(error)
				return res.send({"result":"fail","error": error.message});
			
			res.send({"result": "ok", "playlists": playlists});
		});
	});
	
	app.get("/songs/removeplaylist/:id", auth.log_1, auth.checkAuth, function(req, res){
		var username = req.session.un;
		var id = helpers.getParam("id", req);
		songs.deleteMix(username, id, function(error, playlists){
			if(error)
				return res.send({"result":"fail","error": error.message});
			
			res.send({"result": "ok", "playlists": playlists});
		});
	});
	
	app.post("/songs/search", auth.log_1, auth.checkAuth, function(req, res){
		var searchString = helpers.getParam("s", req);
		songs.searchSongs(searchString, function(error, results){
			if(error)
				return res.send({"result":"fail","error": error.message});
			
			res.send({
				"result":"ok", 
				"counts":results.counts, 
				"results": {
					"artist": results.artist,
					"album": results.album,
					"song": results.title
				}
			});	
		});
	});
	
	app.get("/songs/refreshdata", auth.log_1, auth.checkAuth, function(req, res){
		songs.files = {};
		songs.getfiles(null, function(error, files){
			if(error)
				return res.send({"result":"fail","error": error.message});
				
			res.send({"result":"ok","files": files});
		});
	});
	
	app.get("/zaireeka/:un?", function(req, res){
		app.set("views", __dirname + "/views");
		var username = helpers.getParam("un", req);
		var isAu = auth.isAuthed(username, req, "songs", 2);
		var view = app.get("___view")();
		
		if(isAu){
			view.un = username;
		}else{
			view.showForm = true;
		}
		
		res.render("zaireeka.html", view);
	});
	
	app.get("/songs/playlists", auth.log_1, auth.checkAuth, function(req, res){
		var username = req.session.un;
		songs.getPlaylistNames(username, function(error, playlists){
			if(error)
				return res.send({"result":"fail","error": error.message});
			
			res.send({"result":"ok", "playlists": playlists});
		});
	});
	
	app.get("/songs/:un?", function(req, res){
		
		app.set("views", __dirname + "/views");
		var username = helpers.getParam("un", req);
		var isAu = auth.isAuthed(username, req, "songs", 2);
		var view = app.get("___view")();
		
		
		if(isAu){
			return async.parallel({
				"jsFiles": function(callback){
					helpers.getFileHashes([
						"audio.js", 
						"ui.js",
						"controls.js", 
						"playlist.js",
						"song.js", 
						"storage.js",
						"options.js"
					], __dirname + "/public/lib/", callback);
				},
			}, function(error, results){
				if(error){
					return res.send({"result":"fail","error": error.message});
				}

				view.showList = true;
				view.un = username;
				view.isSu = auth.isSuperUser(username);
				view.jsFiles = results.jsFiles;
				view.ts = new Date().getTime();
				
				res.render("index.html", view);
			});
		}
		
		view.showForm = true;
		
		res.render("index.html", view);
	});
};
