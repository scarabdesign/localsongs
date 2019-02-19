
var displayFiles = function(data, resultType){
	var className = data.type;
	if(resultType == "search" && data.type == "artist"){
		className = "album";
	}
	var returnElem = $(ce("div"))
		.addClass(className)
		.attr({
			"id": data.id
		});
	
	if(data.type == "song"){
		return browsableSongItem(returnElem, data, resultType);
	}
	return browsableDirectoryItem(returnElem, data, resultType);
};

var addTr = function(t){
	return t + " - ";
};
var addTi= function(t, filetype){
	t = t.replace(/\_/g, " ");
	if(filetype){
		t = t.replace(new RegExp("\." + filetype + "$"), "")
	}
	return t;
};

var browsableDirectoryItem = function(returnElem, data, resultType){
	return $(returnElem)
		.append(
			$(ce("div"))
				.addClass("addallbutton clickable hide")
				.append("Add All")
				.click(function(){
					addAllSongs(this);
				}),
			function(){
				if(resultType == "playlist" && data["public"] === false){
					return $(ce("div"))
						.addClass("removeplaylist fa fa-minus-circle fa-2x clickable open")
						.addClass(self.locked ? "deletedisabled" : null)
						.attr({
							"title": "Remove song from queue"
						})
						.on("click", function(){
							if(!confirm("Delete this saved playlist? This cannot be undone.")){
								return;
							}
							removePlaylist(returnElem, data.id);
						});
				}
				return "";
			}(),
			$(ce("div"))
				.addClass("clickable dir")
				.append(
					$(ce("div"))
						.addClass("diricon fa fa-caret-right fa-lg"),
					$(ce("span"))
						.append(
							addTi(data.name || "", data.filetype)
						),
					$(ce("span"))
						.addClass("fa fa-info-circle fa-lg infobutton clickable hide")
						.click(function(e){
							e.stopPropagation();
							showAlbumInfo(data.id, this);
						}),
					function(){
						if(data.time){
							return $(ce("div"))
								.addClass("artistinfo")
								.append("Playtime: ", data.time);
						}
						return  "";
					}()
				)
				.on("click", function(e){
					var self = this;
					var parent = $(this).closest(".album, .artist, .playlist");
					var sub = $("> .sub", parent);
					if(sub.length && !sub.hasClass("hide")){
						$(".infobutton", parent).addClass("hide");
						$(".addallbutton", parent).addClass("hide");
						changeDirIcon(this, false);
						return sub.animate({
							"height": 0
						}, 400, function(){
							sub.empty()
								.addClass("hide")
								.get(0).style
								.removeProperty("height");
						});
					}
	
					activeDirIcon(this, true);
					buildSongItems(data.dir || data.id, resultType, parent, function(){
						activeDirIcon(self, false);
						changeDirIcon(self, true);
					});
				}),
			function(){
				if(resultType == "search"){
					if(data.type == "album" && data.dir){
						return $(ce("div"))
							.addClass("artistinfo")
							.append(inferArtistFromDir(data.dir));
					}
				}
				return "";
			}(),
			$(ce("div"))
				.addClass("sub hide"),
			$(ce("div"))
				.addClass("clear")
		)
		.get(0);
};

var showAlbumInfo = function(id, target){
	
	var container = $(target).closest(".album, .artist, .playlist")
	if(!container){
		return;
	}
	var infoString = $("input[name='albuminfo']", container).val();
	if(!infoString){
		return;
	}
	var info = JSON.parse(infoString);
	if(!info){
		return;
	}
	
	if($(".ai_" + id).length){
		return $(".ai_" + id).remove();
	}
	
	if($(".albuminfopopup").length){
		$(".albuminfopopup").remove();
	}
	
	var infoContent = $(ce("div"))
		.append(
			$(ce("div"))
				.addClass("albuminfo_title")
				.append(
					$(ce("a"))
						.addClass("fa fa fa-info-circle albuminfo_search")
						.attr({
							"href": "http://google.com/search?q=" + info.artist,
							"target": "_blank",
							"title": "Search: " + info.artist
						}),
						"Artist: ", info.artist
					),
			$(ce("div"))
				.addClass("albuminfo_title")
				.append(
					$(ce("a"))
						.addClass("fa fa fa-info-circle albuminfo_search")
						.attr({
							"href": "http://google.com/search?q=" + info.album + " " + info.artist,
							"target": "_blank",
							"title": "Search: " + info.album + " " + info.artist
						}),
						"Album: ", info.album
					),
			function(){
				if(info.images.length){
					return $(ce("div"))
						.addClass("imageviewer")
						.append(
							$(ce("div"))
								.addClass("prev_image fa fa-arrow-circle-left clickable")
								.addClass(info.images.length <= 1 ? "invisible" : "")
								.on("click", function(){
									var frame = $(this)
										.closest(".imageviewer")
										.find(".imageviewer_frame");

									var last = $(frame)
										.children()
										.get(
											$(frame)
												.children()
												.length - 1
										);
									
									$(frame)
										.prepend(last);
								}),
							$(ce("div"))
								.addClass("imageviewer_frame")
								.append(
									$(info.images).map(function(index, image){
										return $(ce("img"))
											.attr({
												"src": image + "?dim=200,200"
											})
											.get(0);
									})
								),
							$(ce("div"))
								.addClass("next_image fa fa-arrow-circle-right clickable")
								.addClass(info.images.length <= 1 ? "invisible" : "")
								.on("click", function(){
									var frame = $(this)
										.closest(".imageviewer")
										.find(".imageviewer_frame");
									
									var first = $(frame)
										.children()
										.get(0);
									
									$(frame)
										.append(first);
								})
						);
				}
				return "";
			}(),
			$(ce("div"))
				.addClass("albuminfo_songlist")
				.append(
					$(ce("div"))
						.append("Track list:"),
					$(info.songs).map(function(index, song){
						return $(ce("div"))
							.append(
								$(ce("a"))
									.addClass("clickable")
									.append("l")
									.attr({
										"href": "http://google.com/search?q=lyrics " + song.title + " " + info.artist,
										"target": "_blank",
										"title": "Lyrics Search: " + song.title + " " + info.artist
									}),
								$(ce("span"))
									.append(song.track + " - " + song.title)
							)
							.get(0);
					})
				)
		);
	
	var infoPop = popUpPanel("albuminfopopup ai_" + id, info.album, infoContent, true, function(){
		$(".albuminfopopup")
			.remove();
	}, true);
	
	$("body")
		.append(
			$(infoPop)
				.removeClass("hide")
		);
};

var buildAlbumInfo = function(target, songs, images){
	if($("input[name='albuminfo']", target).length){
		return;
	}
	var info = {
		"artist": songs[0].info && songs[0].info.artist,
		"album": songs[0].info && songs[0].info.album,
		"images": $(images).map(function(index, image){
			return image.dir;
		}).toArray(),
		"songs": $(songs).map(function(index, song){
			var tr, zeroPad;
			if(song.info && song.info.track){
				tr = parseInt(song.info.track, 10) || (index + 1);
				var zeroPad = "";
				if(songs.length >= 10 && index < 9){
					zeroPad = "0";
				}
				if(songs.length >= 100 && index < 99){
					zeroPad = "00";
				}
			}
			var ti = ((song.info && song.info.title) || song.name);
			var info = {
				"title": ti
			}
			if(tr){
				info.track = zeroPad + tr;
			}
			return info;
		}).toArray()
	};
	$(target)
		.append(
			$(ce("input"))
				.attr({
					"type": "hidden",
					"name": "albuminfo",
					"value": JSON.stringify(info)
				})
		)
};

var browsableSongItem = function(returnElem, data, resultType){
	return $(returnElem)
		.append(
			$(ce("input"))
				.attr({
					"type": "hidden",
					"name": "songdata",
					"value": JSON.stringify(data)
				}),
			$(ce("div"))
				.addClass("playnow alpha_clickable fa fa-play fa-1x")
				.css({
					"background-image": function(){
						if(data.image){
							return "url('" + data.image + "?dim=35,35" + "')";
						}
						return "initial";
					}()
				})
				.attr({
					"title": "Add Song to Queue and Play Now"
				})
				.on("click", data, function(e){
					playlist.addAndPlaySong(e.data);
					alertAndFade("1 Song Added");
				}),
			$(ce("div"))
				.addClass("addsong clickable fa fa-plus fa-1x")
				.attr({
					"title": "Add Song to End of Queue"
				})
				.on("click", data, function(e){
					playlist.addSongToEnd(e.data);
					alertAndFade("1 Song Added");
				}),
			$(ce("div"))
				.addClass("addsong clickable fa fa-indent fa-1x")
				.attr({
					"title": "Add Song to Queue and Play Next"
				})
				.on("click", data, function(e){
					playlist.addSongNext(e.data);
					alertAndFade("1 Song Added");
				}),
			$(ce("li"))
				.append(
					$(ce("span"))
						.append(
							function(){
								var text = "";
								text += addTr(data.track);
								text += addTi(data.title || data.name || "", data.filetype);
								return text;
							}()
						)
				)
				.on("touchstart mousedown", function(e){
					startMarquee(this);
				})
				.on("touchend mouseup", function(e){
					stopMarquee();
				}),
			function(){
				if(resultType == "search" || resultType == "playlistitem"){
					return $(ce("div"))
						.addClass("artistinfo")
						.append(
							data.artist,
							" - ",
							data.album,
							data.time ? " - " + data.time : ""
						);
				}
				return "";
			}(),
			$(ce("div"))
				.addClass("clear")
		)
		.get(0);
};

var buildSongItems = function(dir, resultType, elem, callback){
	var url = "/songs/get";
	var payload = {
		"dir": dir
	};
	var resType;
	if(resultType == "playlist"){
		url = "/songs/getplaylist";
		payload = {
			"id":dir
		};
		resType = "playlistitem";
	}

	ajaxWithOpts(url, "POST", payload, {}, null, function(songData){
		if(songData && songData.result == "ok"){
			var songs = songData.files.songs;
			var images = songData.files.images;
			var target = $("> .sub", $(elem).closest(".album, .artist, .playlist"));
			if(hasSongs(songs)){
				$("> .dir .infobutton", elem).removeClass("hide");
				$("> .addallbutton", elem).removeClass("hide");
				buildAlbumInfo(elem, songs, images);
			}
			$(target)
				.empty()
				.append(
					$(songs).map(function(index, file){
						return displayFiles(parseSongData(file, index), resType);
					})
				)
				.removeClass("hide");
			var h = $(target).height();
			$(target)
				.css({
					"height": 0
				})
				.animate({
					"height": h
				}, 400, function(){
					callback();
					$(target)
						.get(0).style
						.removeProperty("height");
				});
		}
	});
};

var playControls = function(){
	$(".chosensongs")
		.css({
			"top": options.getOption("trackLockingEnabled") ? 185 : 155
		});
	$(".playcontrols")
		.append(
			$(ce("div"))
				.addClass("playcontrolbuttons")
				.append(
					makePlayControlButton("Previous Song", "previous", "fa-fast-backward", false, function(){
						playlist.playPrevious();
					}),
					makePlayControlButton("Restart Song", "restart", "fa-step-backward", false, function(){
						playlist.restartSong();
					}),
					makePlayControlButton("Play Song", "play", "fa-play", true, function(){
						playlist.togglePlay();
					}),
					makePlayControlButton("Next Song", "next", "fa-fast-forward", false, function(){
						playlist.playNext();
					}),
					makePlayControlButton("Show Queue", "songlist", "fa-list", false, function(e){
						changeMode(queueShown ? 0 : 1, true);
					})
				),
			$(ce("div"))
				.addClass("songinfo")
				.append(
					$(ce("div"))
						.addClass("title hide")
						.append(
							$(ce("span"))
						),
					$(ce("div"))
						.addClass("progress hide")
						.append(
							$(ce("div"))
								.addClass("songtracker"),
							$(ce("div"))
								.addClass("totaltime"),
							$(ce("div"))
								.addClass("playprogress")
								.append(
									$(ce("div"))
										.addClass("playtime")
								),
							$(ce("div"))
								.addClass("downloaded")
						)
				),
			$(ce("div"))
				.addClass("utilities")
				.append(
					makeUtilityButton("Hints", "buttonhints", "fa-question", null, true, function(e, callback){
						setTimeout(function(){
							showButtonTitles();
							callback();
						}, 200);
					}),
					makeUtilityButton("Log Out", "logout", "fa-sign-out-alt", null, true, function(e, callback){
						confirmLogout();
						callback();
					}),
					function(){
						var volumeChanger = makeUtilityButton("Volume", "volume", ["fa-volume-up", "ex_out hide"], null, true, function(e, callback){
							openVolume();
							callback();
						});
						changeVolumeIcon(getDisplayVolume(), volumeChanger);
						return volumeChanger;
					}(),
					makeUtilityButton("Randomize", "randomize" + (options.getOption("randomized") ? " israndomized" : ""), "fa-random", null, true, function(e, callback){
						randomize(e);
						callback();
					}),
					makeUtilityButton("Options", "setting", "fa-cog", 1, true, function(e, callback){
						toggleShowOptions();
						callback();
					}),
					makeUtilityButton("Playlists", "viewplaylist", ["fa-bars black", "fa-music"], 0, true, function(e, callback){
						buildPlaylists(null, callback);
					}),
					makeOptionalUtilityButton("Save Playlist", "makeplaylist", ["fa-bars black", "fa-music", "add_plus"], 1, true, "playlistSaving", function(e, callback){
						makePlaylist();
						callback();
					}),
					makeUtilityButton("Search Songs", "searchsongs", "fa-search", 0, false, function(e, callback){
						setTimeout(function(){
							openSearch();
							callback();
						}, 200);
					}),
					function(){
						return $(ce("div"))
							.addClass("clearsearchcontainer hide")
							.append(
								makeUtilityButton("Clear Search", "clearsearch", ["fa-search", "fa-times red clearfilter_x"], 0, false, function(e, callback){
									setTimeout(function(){
										clearSearch($(".searchfield input"));
										callback();
									}, 200)
								})
							);
					}(),
					makeUtilityButton("Filter List", "filterlist", "fa-filter", 1, false, function(e, callback){
						setTimeout(function(){
							openListFilter();
							callback();
						}, 200);
					}),
					function(){
						return $(ce("div"))
							.addClass("clearfiltercontainer hide")
							.append(
								makeUtilityButton("Clear Filter", "clearfilter", ["fa-filter", "fa-times red clearfilter_x"], 1, false, function(e, callback){
									setTimeout(function(){
										clearFiltered($(".filterlistfield input"));
										callback();
									}, 200)
								})
							);
					}(),
					makeUtilityButton("Collapse All", "collapseall", "fa-minus-square", 0, false, function(e, callback){
						setTimeout(function(){
							closeAllBranches();
							callback();
						}, 200);
					}),
					makeUtilityButton("Refresh", "refreshlist", "fa-redo", 0, false, function(e, callback){
						setTimeout(function(){
							refreshSongs();
							callback();
						}, 200);
					}),
					makeUtilityButton("Edit Mode", "editchosen", "fa-edit", 1, false, function(e, callback){
						editChosenSongs();
						callback();
					}),
					makeUtilityButton("Clear All", "clearall", "fa-trash", 1, false, function(e, callback){
						clearChosen();
						callback();
					})
				),
			$(ce("div"))
				.addClass("locking_panel right hide")
				.append(
					$(ce("label"))
						.addClass("fa-stack fa-lg lock_song_master locked clickable")
						.attr({"for": "_lock_all"})
						.append(
							$(ce("i"))
								.addClass("fa fa-lock fa-stack-1x"),
							$(ce("input"))
								.addClass("lock_check_master")
								.attr({
									"type": "checkbox",
									"checked": true,
									"id": "_lock_all"
								})
								.on("change", checkAll)
						),
					$(ce("label"))
						.addClass("fa-stack fa-lg lock_song_master clickable")
						.attr({"for": "_unlock_all"})
						.append(
							$(ce("i"))
								.addClass("fa fa-lock fa-stack-1x"),
							$(ce("input"))
								.addClass("lock_check_master")
								.attr({
									"type": "checkbox",
									"checked": false,
									"id": "_unlock_all"
								})
								.on("change", unCheckAll)
						)
					),
			$(ce("div"))
				.addClass("clear")
		);
};

var makeUtilityButton = function(title, className, faName, mode, right, callback){
	return makeOptionalUtilityButton(title, className, faName, mode, right, false, callback);
}

var makeOptionalUtilityButton = function(title, className, faName, mode, right, hiddenOption, callback){
	var icon, stacked;
	if(faName instanceof Array){
		stacked = "help_stacked"
		icon = $(ce("div"))
			.addClass("stacked icon fa-stack fa-lg")
			.append(
				$(faName).map(function(i, faN){
					return $(ce("i"))
						.addClass("fa fa-stack-1x")
						.addClass(faN)
						.get(0)
				})
			);
	}else{
		icon = $(ce("div"))
			.addClass("icon fa")
			.addClass(faName);
	}

	var elem = $(ce("div"))
		.addClass(className)
		.addClass(mode != null ? "modal mode_" + mode : "")
		.addClass(mode != null && mode !== 0 ? "hide" : "")
		.addClass("utilitybutton clickable")
		.addClass(right ? "right" : "")
		.attr({
			"title": title
		})
		.append(
			$(ce("div"))
				.addClass("fa fa-spinner fa-spin hide"),
			icon,
			$(ce("div"))
				.addClass("title rotatetext")
				.addClass(stacked)
				.append(title)
		)
		.on("click", function(e){
			showHideButtonTitles(false, e.target);
			var self = this;
			if($(self).data().busy){
				return;
			}
			$(self).data().activity(true);
			callback(e, function(){
				$(self).data().activity(false);
			});	
		});
	
	if(hiddenOption){
		var optBool = options.getOption(hiddenOption);
		$(elem).addClass(optBool ? "" : "hidden_option");
	}
	
	$(elem).data({
		"activity": function(onOff){
			var icon = this.self;
			if(onOff == undefined){
				onOff = $(".fa-spinner", icon).hasClass("hide");
			}
			if(onOff){
				$(".icon", icon).addClass("hide");
				$(".fa-spinner", icon).removeClass("hide");
				this.busy = true;
			}else{
				$(".icon", icon).removeClass("hide");
				$(".fa-spinner", icon).addClass("hide");
				this.busy = false;
			}
		},
		"busy": false,
		"self": elem
	});
	return elem;
};

var makePlayControlButton = function(title, className, faName, large, callback){
	return $(ce("div"))
		.addClass(className)
		.addClass("controlbutton clickable")
		.addClass(large ? "lgcont silverradgrad" : "smcont silverlingrad")
		.attr({
			"title": title
		})
		.append(
			$(ce("div"))
				.addClass("icon fa fa-" + (large ? "3x" : "2x"))
				.addClass(faName),
			$(ce("div"))
				.addClass("title")
				.append(title)
		)
		.on("click", function(e){
			callback(e);
			showHideButtonTitles(false, e.target);
		});
};

var openSearch = function(){
	openToolMode();
	if($(".searchcontainer").length > 0){
		$(".searchcontainer")
			.toggleClass("hide");
	}else{
		$(".playcontrols")
			.append(
				$(ce("div"))
					.addClass("searchcontainer")
					.append(
						makeUtilityButton("Back", "searchcloser", "fa-chevron-left", null, false, function(e, callback){
							setTimeout(function(){
								closeSearch();
								if(!hasResults){
									clearSearch(".searchfield input");
								}
								callback();
							}, 200);
						}),
						makeTextField("searchfield", "search", searchKeyUp, searchBeforeClear, searchAfterClear, startSearch),
						makeUtilityButton("Hints", "buttonhints", "fa-question", null, true, function(e, callback){
							setTimeout(function(){
								showButtonTitles();
								callback();
							}, 200);
						}),
						makeUtilityButton("Start Search", "startsearch", "fa-search", null, true, startSearch)
					)
			);
	}
	$(".searchcontainer input[type='text']")
		.focus();
		
};

var openListFilter = function(){
	openToolMode();
	if($(".filterlistcontainer").length > 0){
		$(".filterlistcontainer")
			.toggleClass("hide");
	}else{
		$(".playcontrols")
			.append(
				$(ce("div"))
					.addClass("filterlistcontainer")
					.append(
						makeUtilityButton("Back", "searchcloser", "fa-chevron-left", null, false, function(e, callback){
							setTimeout(function(){
								closeFilter();
								var resCount = $(".chosensong").not(".filteredout").length;
								if(resCount === 0){
									clearFiltered(".filterlistfield input");
								}
								callback();
							}, 200);
						}),
						makeTextField("filterlistfield", "filter",
							filterList,
							function(inputField){
								clearFiltered(inputField);
							},
							function(inputField){
								$(inputField).focus();
							}
						),
						makeUtilityButton("Hints", "buttonhints", "fa-question", null, true, function(e, callback){
							setTimeout(function(){
								showButtonTitles();
								callback();
							}, 200);
						})
					)
			);
	}
	$(".filterlistcontainer input[type='text']")
		.focus();
};

var closeAllPopUps = function(){
	$(".popup_panel")
		.addClass("hide")
		.remove();
};

var popUpPanel = function(classname, headertext, content, showCloser, onClose, modal){
	closeAllPopUps();
	
	var panel = $(ce("div"))
		.addClass("popup_panel hide")
		.addClass(classname);
	
	var modalCover = function(){
		if(modal){
			return $(ce("div"))
				.addClass("popup_panel_modal")
				.on("click", function(){
					$(panel).addClass("hide");
					onClose && onClose();
				});
		}
		return "";
	};
	
	var closer = function(){
		if(showCloser){
			return $(ce("div"))
				.addClass("popup_panel_closer clickable")
				.append("x")
				.on("click", function(){
					$("." + classname).addClass("hide");
					onClose && onClose();
				});
		}
		return "";
	};
	
	return $(panel)
		.append(
			$(ce("div"))
				.addClass("popup_panel_shadow")
				.append(
					$(ce("div"))
						.addClass("popup_panel_content")
						.append(
							$(ce("div"))
								.addClass("popup_panel_header")
								.append(
									closer(),
									headertext || ""
								),
							$(ce("div"))
								.addClass("popup_item_container")
								.append(content)
						)
				),
			modalCover()
		);
	
};