

var Song = function(data){
	this.name = data.name
		.replace(new RegExp("\." + data.type + "$"), "")
		.replace(/\_/g, " ");
	
	this.dir = data.dir;
	this.type = data.type;

	this.title = data.title;
	this.artist = data.artist;
	this.album = data.album;
	this.image = data.image;
	
	this.locked = data.locked || false;
	this.id = data.id;
	this.time = data.time;
	this.uuid = this.newUuid();
	
	this.startIndex;
	this.ui;
	
	this.audiobook = this.dir.search(/\/files\/Audio Books/) === 0;

	this.editmode = false;
};

Song.prototype.getInfoString = function(){
	return [this.title, this.artist, this.album].join(" - ");
};

Song.prototype.newUuid = function(){
	var uuid = "";
	for(var i = 0; i < 32; ++i){
		uuid += Math.floor(Math.random() * 16)
			.toString(16)
			.toUpperCase();
	}
	return uuid;
};

Song.prototype.playSong = function(songItem, elem){
	playlist.playSong(songItem); 
	$(".songcontroler", elem).attr({
		"title": $(".songcontroler", elem).attr("title") == "Play song" ? "Pause song" : "Play song"
	})
};

Song.prototype.bindControls = function(onOff){
	var self = this;
	$(".songcontroler", this.ui)
		.on("click", {
			"self": self
		}, function(e){
			if(!self.editmode){
				self.playSong(e.data.self, this);
			}
		});
	$(".lock_check", this.ui)
		.on("change", function(e){
			self.locked = this.checked;
			if(this.checked){
				$(this).parent().addClass("locked");
				$(this).closest(".chosensong")
					.find(".removechosen")
					.addClass("deletedisabled");
			}else{
				$(this).parent().removeClass("locked");
				$(this).closest(".chosensong")
					.find(".removechosen")
					.removeClass("deletedisabled");
			}
			eventListener($.Event("saveplaylist"));
		})
};

Song.prototype.bindEditControls = function(onOff){
	var self = this;
	$(".removechosen", this.ui)
		.on("click", function(){
			self.remove();
		});
	$(this.ui)
		.draggable({
			"disabled": false,
			"handle": ".songcontroler",
			"axis": "y",
			"delay": 300,
			"zIndex": 10,
			"containment": "parent",
			"helper": "clone",
			"start": function(event, ui){
				$(ui.helper)
					.css({
						"width": $(this).width()
					});
				$(this)
					.css({
						"opacity": 0.40
					});
				self.startIndex = $(this).index(".chosensong:not(.ui-draggable-dragging)");
			},
			"drag": function(event, ui){
				if(ui.offset.top > ($(this).offset().top + ($(this).height() / 2))){
					$(this)
						.next(".chosensong")
						.after(this);
				}
				if(ui.offset.top <  ($(this).offset().top - ($(ui.helper).height() / 2))){
					$(this)
						.prev(".chosensong")
						.before(this);
				}
			},
			"stop": function(event, ui){
				$(this)
					.removeAttr("style");
				self.adjustIndex($(this).index(".chosensong:not(.ui-draggable-dragging)"));
			}
		});
};

Song.prototype.unbindControls = function(){
	$(".songcontroler", this.ui)
		.unbind( "click" );
	$(".lock_check", this.ui)
		.unbind( "click" );
};

Song.prototype.unbindEditControls = function(){
	$(this.ui)
		.removeAttr("ui-draggable");
	$(".removechosen", this.ui)
		.unbind( "click" );
};

Song.prototype.editMode = function(onOff){
	if(!this.ui)
		return;
	
	this.editmode = onOff;
	
	var self = this;
	if(onOff){
		this.bindEditControls();
		$(".songcontroler", this.ui)
			.removeClass("fa-play-circle-o")
			.removeClass("fa-pause")
			.addClass("fa-bars");
		$(".removechosen", this.ui)
			.removeClass("hide");
	}else{
		this.unbindEditControls();
		$(".songcontroler", this.ui)
			.removeClass("fa-bars")
			.addClass(this.isCurrentSong() ? "fa-pause" : "fa-play-circle-o");
		$(".removechosen", this.ui)
			.addClass("hide");
	}
};

Song.prototype.remove = function(){
	if(this.locked){
		return;
	}
	playlist.removeSong(this);
	this.ui && $(this.ui).remove();
};

Song.prototype.songPlaying = function(){
	return playlist.currentSong && 
		playlist.currentSong.uuid == this.uuid && 
		playlist.audio.isPlaying();
};

Song.prototype.isCurrentSong = function(){
	return playlist.currentSong && playlist.currentSong.uuid == this.uuid;
};

Song.prototype.adjustIndex = function(index){
	if(this.startIndex != undefined && this.startIndex === index){
		return;
	}
	playlist.adjustOrder(this.startIndex, index);
};

Song.prototype.getIndex = function(){
	if(!this.ui)
		return false;
	return $(this.ui).index(".chosensong");
};

Song.prototype.notCurrentUI = function(){
	$(this.ui).removeClass("hilightsong");
};

Song.prototype.isCurrentUI = function(play){
	$(this.ui).addClass("hilightsong");
};

Song.prototype.stopPlayUI = function(){
	this.ui && $(".songcontroler", this.ui)
		.removeClass("currentsong")
		.removeClass("fa-pause")
		.addClass("fa-play-circle-o");
};

Song.prototype.startPlayUI = function(play){
	this.ui && $(".songcontroler", this.ui)
		.addClass("currentsong")
		.addClass("fa-pause")
		.removeClass("fa-play-circle-o");
};

Song.prototype.getUI = function(playlist){
	if(!this.ui){
		var self = this;
		
		this.ui = $(ce("div"))
			.addClass("chosensong")
			.addClass(this.isCurrentSong() ? "hilightsong" : "")
			.append(
				$(ce("div"))
					.addClass("removechosen fa fa-minus-circle fa-2x clickable open hide")
					.addClass(self.locked ? "deletedisabled" : null)
					.attr({
						"title": "Remove song from queue"
					}),
				$(ce("label"))
					.addClass(options.getOption("trackLockingEnabled") ? "" : "hide")
					.addClass("fa-stack fa-lg lock_song clickable")
					.addClass(self.locked ? "locked" : null)
					.attr({"for": "_lock_" + self.uuid})
					.append(
						$(ce("i"))
							.addClass("fa fa-lock fa-stack-2x"),
						$(ce("input"))
							.addClass("lock_check")
							.attr({
								"type": "checkbox",
								"checked": self.locked,
								"id": "_lock_" + self.uuid
							})
					),
				$(ce("a"))
					.addClass("songinfosearch clickable")
					.addClass(options.getOption("songinfosearch") ? "" : "hide")
					.attr({
						"href": "http://google.com/search?q=lyrics " + self.title + " " + self.artist,
						"target": "_blank",
						"title": "Lyrics Search: " + self.title + " " + self.artist
					})
					.append("l"),
				$(ce("div"))
					.addClass("songcontroler alpha_clickable fa fa-2x")
					.addClass(this.isCurrentSong() ? "currentsong" : "")
					.addClass(this.songPlaying() ? "fa-pause" : "fa-play-circle-o")
					.css({
						"background-image": function(){
							if(self.image){
								return "url('" + self.image + "')";
							}
							return "initial";
						}()
					})
					.attr({
						"id": this.uuid,
						"title": this.songPlaying() ? "Pause song" : "Play song"
					}),
				$(ce("input"))
					.attr({
						"type": "hidden",
						"name": "uuid",
						"value": this.uuid
					}),
				$(ce("span"))
					.addClass("title")
					.append(
						this.title || this.name
					),
				function(){
					if(self.artist)
						return $(ce("span"))
							.addClass("artist")
							.append(self.artist);
					return "";
				}(),
				function(){
					if(self.album)
						return $(ce("span"))
							.addClass("album")
							.append(self.album);
					return "";
				}(),
				$(ce("div"))
					.addClass("clear")
			);
	}else{
		if(this.songPlaying()){
			this.startPlayUI();
		}
		this.isCurrentUI();
	}
	
	if(!this.isCurrentSong()){
		this.notCurrentUI();
		this.stopPlayUI();
	}
	
	this.unbindControls();
	this.bindControls();
	return this.ui;
};

var ce = function(type){
	return document.createElement(type);
};