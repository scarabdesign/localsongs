
//Todo
//	Cleanup
//XXX		Combine search results builder with regular builder
//				(includes "Add All" button)
//XXX		Song class (and others?) references global playlist instance
//				playlist class should listen to song class and
//				song class should listen to audio instance
//				perhaps need a common place to reference instances?
//XXX		Combine listeners into a common system
//XXX		Clean up Utils panels
//				make sub panels generic
//				include close and opening for generic utils panels
//				make "clear all" part of edit mode
//	PlayList
//XXX		song preloading
//	Server Side
//XXX		exclude folders with no content of acceptable types

//Bugs
//XXX	might be trying to move dir many times (download)
//XXX	clicking on a chosen song to play it after one was dragged shows pause button on prev track
//XXX	search after files deleted (?) does not work
//XXX	numbering (in various) not correct

var initSongs = function(){
	loadSongs(function(){
		setUpStorage(function(){
			setUpOptions();
			playControls();
			playListSetup();
			fetchPlaylists();
//			resumeDownload();
			makeTracker();
			shortcutKeys();
			windowListeners();
		});
	});
};

var windowListenerTimeout;
var windowListeners = function(){
	$(window).on("resize", function() {
		startTitleMarquee(null, true);
		if(windowListenerTimeout){
			return;
		}
		windowListenerTimeout = setTimeout(function(){
			clearTimeout(windowListenerTimeout);
			windowListenerTimeout = null;
			startTitleMarquee(".songinfo .title");
			$(document).scrollTop(0);
		}, 300);
	});
};

var changeDirIcon = function(target, downRight){
	if(downRight == undefined){
		downRight = !$(".diricon", target).hasClass("fa-caret-right");
	}
	if(downRight){
		$(".diricon", target)
			.addClass("fa-caret-down")
			.removeClass("fa-caret-right");
	}else{
		$(".diricon", target)
			.removeClass("fa-caret-down")
			.addClass("fa-caret-right");
	}
};

var activeDirIcon = function(target, active){
	if(active == undefined){
		active = !$(".diricon", target).hasClass("fa-spinner");
	}
	var right = $(".diricon", target).hasClass("fa-caret-right");
	var down = $(".diricon", target).hasClass("fa-caret-down");
	if(active){
		$(".diricon", target)
			.addClass("fa-spinner fa-spin")
			.removeClass("fa-caret-right fa-caret-down");
	}else{
		$(".diricon", target)
			.removeClass("fa-spinner fa-spin")
		if(right){
			 $(".diricon", target).addClass("fa-caret-right");
		}
		if(down){
			 $(".diricon", target).addClass("fa-caret-down");
		}
	}
}

var removePlaylist = function(target, id){
	$(target).remove();
	playlist.removePlaylist(id, function(){
		getPlaylists();
	})
};

var hasSongs = function(data){
	for(var i = 0, l = data.length; i < l; ++i){
		if(data[i].type == "song"){
			return true;
		}
	}
};

var addAllSongs = function(target){
	var songsArray = [];
	$("> .sub > .song input[name='songdata']", $(target).parent())
		.each(function(index, songdataElem){
			var songdataString = $(songdataElem).val();
			try{
				songdata = JSON.parse(songdataString);
				songsArray.push(songdata);
			}catch(e){
				//nothing
			}
		});
	playlist.addSongsFromArray(songsArray);
	alertAndFade(songsArray.length + " Song" + (songsArray.length != 1 ? "s" : "") + " Added");
}

var titleInterval;
var startTitleMarquee = function(target, stop, mod){
	
	clearInterval(titleInterval);
	titleInterval = null;
	
	var textWidth = $("span", target).width();
	var contWidth = $(target).width();
	
	if(stop || textWidth <= contWidth){
		return $(target)
			.animate({
				"text-indent": 0
			}, 3000, function(){
				$(target)
					.css({
						"text-indent": "initial"
					});
			});
	}
	
	var indent;
	if(mod){
		indent = 0;
	}else{
		indent = ((textWidth - contWidth) * -1);
	}

	$(target)
		.animate({
			"text-indent": indent
		}, 5000, function(){
			titleInterval = setTimeout(function(){
				startTitleMarquee(target, stop, !mod);
			}, 2000);
		});
};

var marqueeTimer, startMarqueeTimer;
var textMarquee = function(t){
	var target = $(t);
	var ti = parseInt($(target).css("text-indent"), 10) || 0;
	ti -= 10;
	if(ti <= $("span", target).width() * -1){
		ti = $(target).width() + 10;
	}
	$(target)
		.addClass("marquee")
		.css({
			"text-indent": ti
		});
}

var startMarquee = function(target){
	startMarqueeTimer = setTimeout(function(){
		if(!marqueeTimer){
			marqueeTimer = setInterval(function(){
				textMarquee(target);
			}, 100);
		}
	}, 1000);
};

var stopMarquee = function(){
	clearTimeout(startMarqueeTimer);
	clearInterval(marqueeTimer);
	marqueeTimer = null;
	$(".marquee")
		.removeClass("marquee")
		.css({
			"text-indent": 0
		});
};

var inferArtistFromDir = function(dir){
	 return dir.split("/")[2];
};

var parseSongData = function(data, index){
	var info = JSON.parse(JSON.stringify(data));
	if(!info.id){
		info.id = info.dir.replace(/[^A-Za-z0-9]/g, "");
	}
	delete info.info;
	if(data.info){
		if(data.info.artist){
			info.artist = data.info.artist;
		}
		if(data.info.album){
			info.album = data.info.album;
		}
		if(data.info.title){
			info.title = data.info.title;
		}
		if(data.info.track){
			info.track = parseInt(data.info.track, 10);
		}
	}
	if(data.info && info.track == undefined){
		info.track = index + 1;
	}
	return info;
};

var volumeControl;
var changeVolumeIcon = function(volumeLevel, elem){
	if(!elem){
		elem = $(".volume");
	}
	var icon = $(".icon .fa-volume-up, .icon .fa-volume-down, .icon .fa-volume-off", elem);
	if(volumeLevel == 0){
		$(icon)
			.removeClass("fa-volume-up fa-volume-down")
			.addClass("fa-volume-off");
		$(".ex_out", elem)
			.removeClass("hide");
	}
	if(volumeLevel > 0 && volumeLevel < 40){
		$(icon)
			.removeClass("fa-volume-up fa-volume-off")
			.addClass("fa-volume-down");
		$(".ex_out", elem)
			.addClass("hide");
	}
	if(volumeLevel > 40){
		$(icon)
			.removeClass("fa-volume-down fa-volume-off")
			.addClass("fa-volume-up");
		$(".ex_out", elem)
			.addClass("hide");
	}
}

var getDisplayVolume = function(){
	var vol = options.getOption("volumelevel");
	if(playlist){
		vol = playlist.getVolume();
	}
	return vol;
};

var openVolume = function(onOff){
	if(onOff == undefined){
		onOff = !$(".volume").hasClass("red");
	}
	if(onOff){
		var volumeLevel = getDisplayVolume();
		if(!volumeControl){
			volumeControl = $(ce("div"))
				.addClass("volume_control")
				.append(
					$(ce("div"))
						.addClass("volume_slider")
						.slider({
							"orientation": "vertical",
							"value": volumeLevel,
							"slide": function(e, ui){
								$(ui.handle).html(ui.value)
								playlist.setVolume(ui.value);
								changeVolumeIcon(ui.value);
							},
							"stop": function(e, ui){
								$(ui.handle).blur();
							}
						})
				);
		}
		$(".volume")
			.addClass("red");
		$(".volume .icon")
			.after(volumeControl);
		$(".volume .title")
			.addClass("opaque");
		$(".volume_slider span")
			.append(volumeLevel);
	}else{
		$(".volume")
			.removeClass("red");
		$(".volume .title")
			.removeClass("opaque");
		if(volumeControl){
			volumeControl.remove();
			volumeControl = null;
		}
	}
	changeVolumeIcon(volumeLevel);
};

var buildVolumeControl = function(){
	return 
}

var randomize = function(e){
	var onOff = !$(".randomize").hasClass("israndomized");
	if(onOff){
		playlist.randomizeList();
		$(".randomize").addClass("israndomized");
	}else{
		playlist.unrandomize();
		$(".randomize").removeClass("israndomized");
	}
};

var checkAll = function(){
	this.checked = true;
	$(".lock_check").not(":checked").trigger("click");
	storage.save();
};

var unCheckAll = function(e){
	this.checked = false;
	$(".lock_check:checked").trigger("click");
	storage.save();
};

var buildPlaylists = function(onOff, callback){
	$(".playlists")
		.empty()
		.append(
			$(playlists).map(function(index, file){
				return displayFiles(parseSongData(file, index), "playlist");
			}),
			function(){
				if(!playlists.length){
					return $(ce("div"))
						.addClass("emptylist")
						.append("No playlists")
				}
				return "";
			}()
		);
	togglePlaylists(onOff, true, callback);
};

var playlists;
var getPlaylists = function(callback){
	playlist.getPlaylists(function(error, pls){
		if(error){
			return console.log(error);
		}
		playlists = pls;
		callback && callback();
	});
};

var fetchPlaylists = function(){
	$(".viewplaylist").data().activity(true);
	getPlaylists(function(){
		$(".viewplaylist").data().activity(false);
	});
};

var makePlaylist = function(){
	var playlistName = prompt("Save a playlist with the queued tracks? Please name the playlist:", new Date().getTime());
	if(playlistName){
//		if(confirm("Make this playlist public so anyone can use it?")){
//			username = null;
//		}
		$(".makeplaylist").data().activity(true);
		playlist.makePlaylist(playlistName, function(error, playlist){
			if(error){
				return console.log(error);
			}
			playlists = playlist;
			$(".makeplaylist").data().activity(false);
		});
	}
};

var clearChosen = function(){
	var count = playlist.songCount();
	var lockedCount = playlist.lockedSongCount();
	if(!count)
		return;
	var message = "Remove " + count + " songs from the queue?";
	if(lockedCount){
		message += " (" + lockedCount + " songs locked)"
	}
	if(!confirm(message))
		return;
	clearallchosen();
}; 

var showButtonTitles = function(){
	$(".utilitybutton, .controlbutton, .clearfield")
		.toggleClass("titleshown");
	if(!mobileDevice){
		toggleShowShortcutKeys($(".utilitybutton, .controlbutton, .clearfield").hasClass("titleshown"));
	}
};

var showHideButtonTitles = function(onOff, target){
	if(target && $(target).parent().hasClass("buttonhints"))
		return;
	
	if(onOff == undefined){
		onOff = $(".buttonhints").hasClass("titleshown");
	}
	$(".utilitybutton, .controlbutton, .clearfield")
		.addClass(onOff && "titleshown")
		.removeClass(!onOff && "titleshown");
	
	if(!mobileDevice && onOff){
		toggleShowShortcutKeys(onOff);
	}
};

var startSearch = function(e, callback){
	var searchString = $("input[name='search']").val();
	searchSongs(searchString, callback);
}

//var startMagnateDownload = function(){
//	var magnate = $("input[name='download']").val();
//	startDownload(magnate);
//};

var searchKeyUp = function(inputField){
	if(searchRequest){
		searchRequest.abort();
		searchRequest = null;
		loadSongs();
	}
	var ap = activePanel || ".availablesongs";
	setTimeout(function(){
		searchText(inputField, false, ap, activePanel + " span");
	}, 0);
};

var searchBeforeClear = function(inputField){
	if(searchRequest){
		searchRequest.abort();
		searchRequest = null;
	}
	if($(inputField).val())
		loadSongs();
};

var searchAfterClear = function(inputField){
	var ap = activePanel || ".availablesongs";
	searchText(inputField, true, activePanel, activePanel + " span");
	clearSearch(inputField);
	$(inputField).focus();
};

var makeTextField = function(className, fieldName, onKeyUp, onBeforeClear, onAfterClear, onEnter){
	var clearButton = $(ce("div"))
		.addClass("clearfield clickable")
		.append(
			$(ce("div"))
				.addClass("icon fa fa-times-circle"),
			$(ce("div"))
				.addClass("title rotatetext hide")
				.append("Clear Field")
		)
		.on("click", {"onAfterClear": onAfterClear}, function(e){
			var textField = $("input", $(this).parent())
			$(textField).val("");
			e.data.onAfterClear && e.data.onAfterClear(textField);
			showHideButtonTitles(false);
		});
	
	if(onBeforeClear){
		clearButton.on("mousedown touchstart", {"onBeforeClear": onBeforeClear}, function(e){
			e.data.onBeforeClear($("input", $(this).parent()));
		});
	}
	
	var textField = $(ce("div"))
		.addClass("textfield")
		.addClass(className)
		.append(
			$(ce("input"))
				.attr({
					"type": "text",
					"name": fieldName,
					"autocomplete": "off"
				}),
			clearButton
		);
	
	if(onKeyUp){
		textField.on("keyup", {"onKeyUp": onKeyUp}, function(e){
			e.data.onKeyUp($("input", $(this).parent()));
		});
	}
	
	if(onEnter){
		textField.on("keyup", {"onEnter": onEnter}, function(e){
			if(e.data.onEnter && e.which == 13){
				e.data.onEnter();
			}
		});
	}
	
	return textField;
};

var clearSearch = function(inputField){
	searchText(inputField, true);
	loadSongs();	
	$(inputField).val("");
	$(".clearsearchcontainer").addClass("hide");
};

var closeSearch = function(){
	$(".searchcontainer")
		.addClass("hide");
	$(".utilities")
		.removeClass("hide");
};

var escapeOptions = function(){
//	closeDownload();
	closeSearch();
	closeFilter();
	openVolume(false);
	toggleShowOptions(false);
	showHideButtonTitles(false);
	closeAllPopUps();
};

var closeFilter = function(){
	$(".filterlistcontainer")
		.addClass("hide");
	$(".utilities")
		.removeClass("hide");
	toggleLocking();
};

var clearFiltered = function(inputField){
	if(!$(inputField).val())
		return;
	$(".filteredout").removeClass("filteredout");
	scrollToCurrentSong();
	$(inputField).val("");
	$(".clearfiltercontainer").addClass("hide");
};

var filterList = function(inputField){
	var searchTerm = $(inputField).val().trim();
	if(!searchTerm.length){
		return clearFiltered(inputField);
	}
	$(".clearfiltercontainer").removeClass("hide");
	var ap = activePanel || ".chosensongs";
	$(activePanel)
		.children()
		.each(function(a, b){
			$(b).removeClass("filteredout");
			expandedText = $(b).children().map(function(a, b){
				return $(b).text();
			}).toArray().join(" ").trim();
			var matches = expandedText.match(new RegExp(searchTerm, "ig"));
			if(!matches){
				$(b).addClass("filteredout");
			}
		});
};

var stringPosFound = -1;
var elemPosFound = -1;
var searchText =  function(inputField, reset, containerSelector, textSelector){
	var finish = function(found){
		if(found){
			stringPosFound = -1;
			elemPosFound = -1;
			$(inputField)
				.removeAttr("style");
		}else{
			stringPosFound = searchTerm.length;
			$(inputField)
				.css({"color": "red"});
		}
	};
	
	if(reset){
		$(inputField)
			.removeAttr("style");
		
		$(".textfound")
			.removeClass("textfound");
		
		return finish(true);
	}
	
	var searchTerm = $(inputField).val().trim();

	if(!searchTerm){
		$(containerSelector)
			.scrollTop(0);
		
		$(".textfound")
			.removeClass("textfound");
		
		return finish(true);
	}
	
	if((stringPosFound && stringPosFound > 0) && searchTerm.length >= stringPosFound)
		return;

	$(textSelector).each(function(a, b){
		var expandedText;
		var textCont = $(b).children();
		
		if(!textCont.length){
			expandedText = $(b).text();
		}else{
			expandedText = textCont.map(function(a, b){
				return $(b).text();
			}).toArray().join(" ").trim();
		}
		
		var matches = expandedText.match(new RegExp(searchTerm, "ig"));
		if(matches){
			if(a != elemPosFound){
				
				$(".textfound")
					.removeClass("textfound");
				
				$(b).addClass("textfound").scrollintoview({
					"duration": "fast",
					"direction": "vertical"
				});
			}
			elemPosFound = a;
			finish(true);
			return false;
		}
		finish(false);
	});
};

var openToolMode = function(){
	$(".utilities")
		.toggleClass("hide");
	toggleLocking();
};

var clearallchosen = function(){
	$(".lock_song input:not(:checked)").each(function(index, elem){
		$(elem).closest(".chosensong").remove();
	});
	playlist.clearList();
};

var hasResults = false;
var searchRequest;
var searchSongs = function(searchString, callback){
	if(!searchString)
		return;
	
	togglePlaylists(false, true);
	
	$(".availablesongs")
		.empty()
		.append(
			$(ce("div"))
				.addClass("searchwait fa fa-spinner fa-spin")
		);
	
	searchRequest = ajaxWithOpts("/songs/search", "POST", {"s": searchString}, {}, null, function(data){
		if(data && data.result == "ok"){
			var result = data.results;
			$(".availablesongs")
				.empty();
			$.each(
				result, 
				function(type, data){
					if(!result[type].length){
						return true;
					}
					if(hasSongs(result[type])){
						$(".searchresultsheader .addallbutton").removeClass("hide");
					}
					$(".availablesongs")
						.append(
							$(ce("div"))
								.addClass("searchresultsheader")
								.addClass(type + "_resultsheader")
								.append(
									capitalize(type), " results",
									function(){
										if(type == "song"){
											return $(ce("div"))
												.addClass("addallbutton clickable hide")
												.append("Add All")
												.click(function(e){
													var songsArray = [];
													$(".song_results > .song input[name='songdata']")
														.each(function(index, songdataElem){
															var songdataString = $(songdataElem).val();
															try{
																songdata = JSON.parse(songdataString);
																songsArray.push(songdata);
															}catch(e){
																//nothing
															}
														});
													playlist.addSongsFromArray(songsArray);
													alertAndFade(songsArray.length + " Song" + (songsArray.length != 1 ? "s" : "") + " Added");
												});
										}
										return "";
									}()
								),
							$(ce("div"))
								.addClass("sub searchresult")
								.addClass(type + "_results")
								.append(
									$(result[type]).map(function(index, file){
										return displayFiles(parseSongData(file, index), "search");
									})
								)
						);
				}
			);
			if(data.counts.artist == 0 &&
				data.counts.album == 0 &&
				data.counts.title == 0){
				hasResults = false;
				$(".availablesongs")
					.append(
						$(ce("div"))
							.addClass("emptylist")
							.append("No search results")
					);
			}else{
				hasResults = true;
				$(".clearsearchcontainer").removeClass("hide");
			}
		}
		callback && callback();
	});
};

var editmode = false;
var editChosenSongs = function(){
	editmode = !editmode;
	$(".utilities .editchosen")
		.addClass(editmode ? "editmode" : "")
		.removeClass(!editmode ? "editmode" : "");
	for(var i = 0, l = playlist.list.length; i < l; ++i){
		var song = playlist.getSong(playlist.list[i]);
		song.editMode(editmode);
	}
};

var toggleLocking = function(onOff){
	if(onOff == undefined){
		onOff = $(".locking_panel").hasClass("hide");
	}
	if(onOff == true && !options.getOption("trackLockingEnabled")){
		onOff = false;
	}
	if(!queueShown){
		onOff = false;
	}
	if(onOff){
		$(".lock_song").removeClass("hide");
		$(".locking_panel")
			.removeClass(onOff && "hide");
		$(".chosensongs")
			.css({
				"top": 185
			});
	}else{
		$(".locking_panel")
			.addClass(!onOff && "hide");
		$(".chosensongs")
			.css({
				"top": 155
			});
		$(".lock_song").addClass("hide");
		$(".lock_check:checked").trigger("click");
	}
	playlist.saveList();
};

var toggleSongInfoSearch = function(onOff){
	if(onOff){
		$(".songinfosearch")
			.removeClass("hide");
	}else{
		$(".songinfosearch")
			.addClass("hide");
	}
};

var togglePlaylistSaving = function(onOff){
	if(onOff == undefined){
		onOff = $(".makeplaylist").hasClass("hidden_option");
	}
	if(onOff == true && !options.getOption("playlistSaving")){
		onOff = false;
	}
	if(onOff){
		$(".makeplaylist").removeClass("hidden_option");
	}else{
		$(".makeplaylist").addClass(!onOff && "hidden_option");
	}
}

var alertTimeout;
var alertAndFade = function(message, replace){
	
	var alertElem = $(ce("div"))
		.addClass("alert")
		.append(
			$(ce("div"))
				.append(message)
		);
	
	if(replace){
		$(".alertbody")
			.empty();
	}
	
	$(".alertbody")
		.prepend(alertElem)
		.removeClass("hide");
	
	alertTimeout = setTimeout(function(){
		$(alertElem)
			.animate({
				"opacity": 0
			}, 1000, function(){
				$(alertElem).remove();
				if($(".alertbody").children() == 0){
					$(".alertbody")
						.addClass("hide");
				}
			});
	}, 1000);
};

//var closeDownload = function(){
//	$(".downloadcontainer")
//		.addClass("hide");
//	$(".utilities")
//		.removeClass("hide");
//	toggleLocking(false);
//	
//	if(downloadObject){
//		downloadObject.monitor = false
//		if(downloadObject.status == "refreshed"){
//			resetDownloadUi();
//			downloadObject.cancelDownload(function(){
//				currentDl = null;
//				downloadObject = null;
//			});
//		}
//	}else{
//		clearFiltered($(".downloadfield input"));
//	}
//};
//
//var startDownload = function(magnate){
//	if(magnate){
//		downloadObject = new Download(magnate);
//		downloadObject.addListener("updated", updateDownloadProgress);
//		downloadObject.startDownload();
//	}
//};
//
//var downloadObject;
//var resumeDownload = function(){
//	if(currentDl){
//		downloadObject = new Download();
//		downloadObject.percent = currentDl.percent;
//		downloadObject.status = currentDl.status;
//		downloadObject.pid = currentDl.pid;
//		downloadObject.filename = currentDl.filename;
//		downloadObject.addListener("updated", updateDownloadProgress);
//		downloadObject.monitorDownload();
//		downloadObject.eventListener($.Event("updated"));
//	}
//};
//
//var resetDownloadUi = function(){
//	$(".downloadform")
//		.removeClass("hide");
//	$(".downloadprogresscontainer")
//		.addClass("hide");
//	$(".downloadprogress")
//		.css({
//			"width": "0%"
//		});
//	$(".downloadstatus")
//		.empty()
//		.append("starting");
//	$(".downloadpercent")
//		.empty()
//		.append("0%");
//	$(".downloadfilename")
//		.empty();
//	$(".downloadform input[type='text']")
//		.val("");
//};
//
//var updateDownloadProgress = function(event, dl){
//	if(dl.error){
//		$(".downloadfilename")
//			.empty()
//			.append(dl.error);
//		$(".canceldownload")
//			.addClass("hide")
//		return;
//	}
//	
//	$(".downloadform")
//		.addClass("hide");
//	$(".downloadprogresscontainer")
//		.removeClass("hide");
//	$(".downloadprogress")
//		.css({
//			"width": dl.percent + "%"
//		});
//	$(".downloadstatus")
//		.empty()
//		.append(dl.status);
//	$(".downloadpercent")
//		.empty()
//		.append(dl.percent + "%");
//	$(".downloadfilename")
//		.empty()
//		.append(dl.filename);
//	
//	if(dl.status == "refreshed"){
//		$(".canceldownload")
//			.addClass("hide");
//		refreshSongs();
//	}
//};

var buildChosenSongsList = function(){
	$(".chosensongs")
		.empty()
		.append(
			$(playlist.list).map(function(index, uuid){
				var song = playlist.getSong(uuid);
				return song.getUI(playlist).get(0);
			})
		);
	emptyListMessage();
};

var emptyListMessage = function(){
	if(!$(".chosensongs").children().length){
		$(".chosensongs")
			.append(
				$(ce("div"))
					.addClass("emptylist")
					.append("No songs in queue")
			);
	}
};

var changing = false;
var changeMode = function(mode, animated){
	if(changing){
		return;
	}
	if(editmode)
		editChosenSongs();
	escapeOptions();
	if(animated){
		changing = true;
		showSongListAnimated(function(){
			changing = false;
		});
	}else{
		showSongList();
	}
	toggleLocking(queueShown);
	
	$(".utilities .modal")
		.addClass("hide");
	$(".utilities .mode_" +  mode)
		.removeClass("hide");
};

var queueShown = false;
var activePanel = ".availablesongs";
var showSongList = function(){
	if(!queueShown){
		toggleQueue(true);
		toggleAvailable(false);
		togglePlaylists(false);
	}else{
		toggleAvailable(true);
		toggleQueue(false);
	}
};

var showSongListAnimated = function(callback){
	if(!queueShown){
		toggleQueue(true, true, function(){
			toggleAvailable(false);
			togglePlaylists(false);
			callback && callback()
		});
	}else{
		toggleAvailable(true, true, function(){
			toggleQueue(false);
			callback && callback()
		});
	}
};

var toggleQueue = function(onOff, animate, callback){
	if(onOff == undefined){
		onOff = !$(".chosensongs").hasClass("hide");
	}
	if(onOff){
		buildChosenSongsList();
		scrollToCurrentSong(false);
		activePanel = ".chosensongs";
		queueShown = true;
		$(".songlist .icon")
			.addClass("listshown");
		if(animate){
			return $(".chosensongs")
				.removeClass("hide")
				.css({
					"left": $(window).width(),
					"z-index": 10
				})
				.animate({
					"left": 0
				}, 300, function(){
					callback && callback();
					alertAndFade("Song Queue", true);
					$(".chosensongs")
						.get(0).style
						.removeProperty("z-index");
				});
		}
		$(".chosensongs").removeClass("hide");
	}else{
		$(".chosensongs").addClass("hide");
		$(".songlist .icon")
			.removeClass("listshown");
	}
	callback && callback();
};

var toggleAvailable = function(onOff, animate, callback){
	if(onOff == undefined){
		onOff = !$(".availablesongs").hasClass("hide");
	}
	if(onOff){
		activePanel = ".availablesongs";
		queueShown = false;
		if(animate){
			$(".availablesongs")
				.removeClass("hide");
			var winW = $(window).width();
			var panW = $(".availablesongs").width();
			return $(".availablesongs")
				.css({
					"right": winW,
					"left": (panW + winW) * -1,
					"z-index": 10
				})				
				.animate({
					"right": 0,
					"left": 0
				}, 300, function(){
					callback && callback();
					alertAndFade("Browse Songs", true);
					$(".availablesongs")
						.get(0).style
						.removeProperty("z-index");
				});
		}
		$(".availablesongs").removeClass("hide");
	}else{
		$(".availablesongs").addClass("hide");
	}
	callback && callback();
};

var togglePlaylists = function(onOff, animate, callback){
	if(onOff == undefined){
		onOff = $(".playlists").hasClass("hide");
	}
	if(onOff){
		activePanel = ".playlists";
		$(".viewplaylist")
			.addClass("playlistsshown");
		if(animate){
			return $(".playlists")
				.removeClass("hide")
				.css({
					"z-index": 10,
					"bottom": $(".playlists").height()
				})
				.animate({
					"bottom": 0
				}, 300, function(){
					alertAndFade("Saved Playlists", true);
					toggleAvailable(false);
					callback && callback();
				});
		}
		toggleAvailable(false);
		$(".playlists")
			.removeClass("hide");
	}else{
		$(".viewplaylist")
			.removeClass("playlistsshown");
		if(animate && activePanel == ".playlists"){
			if(!queueShown){
				toggleAvailable(true);
			}
			return $(".playlists")
				.css({
					"bottom": 0
				})
				.animate({
					"bottom": $(".playlists").offset().top
				}, 300, function(){
					callback && callback();
					alertAndFade("Browse Songs", true);
					$(".playlists")
						.addClass("hide")
						.get(0).style
						.removeProperty("z-index");
				});
		}
		if(!queueShown){
			toggleAvailable(true);
		}
		$(".playlists")
			.addClass("hide");
	}
};

var playlist;
var playListSetup = function(){
	playlist = new PlayList(options);
	
	playlist.addListener([
		"ended",
		"play",
		"pause",
		"downloaded",
		"playprogress",
		"currenttime",
		"abort",
		"emptied",
		"songscleared",
		"metadataloaded"
	], eventListener);
	
	if(playlist.list.length){
		changeMode(1);
	}
};

var changePlayButton = function(event){
	switch(event){
		case "ended":
		case "error":
		case "pause":
			$(".controlbutton.play .icon")
				.removeClass("fa-pause")
				.addClass("fa-play");
			break;
		case "play":
			$(".controlbutton.play .icon")
				.addClass("fa-pause")
				.removeClass("fa-play");
			break;
	}
};

var updateCurrentSongInfo = function(data){
	$(".songinfo .title span").empty();
	if(data){
		var title = [];
		if(data.title || data.name){
			title.push(data.title || data.name);
		}
		if(data.artist){
			title.push(data.artist);
		}
		if(data.album){
			title.push(data.album);
		}
		$(".songinfo .title span").append(title.join(" - "));
		$(".songinfo .title, .songinfo .progress").removeClass("hide");
		$(document).find("title").text(title.join(" - "));
		startTitleMarquee(".songinfo .title");
	}else{
		$(".songinfo .title, .songinfo .progress").addClass("hide");
		$(document).find("title").text("Songs");
		startTitleMarquee(null, true);
	}
};

var currentPlayProgress = 0;
var updateCurrentProgress = function(event, data){
	var barWidth = $(".progress").width();
	var units =  barWidth / 100;
	var progress = Math.round(units * data);
	if(progress != currentPlayProgress || data === 0){
		currentPlayProgress = progress;
		$(".songinfo ." + event.type).css({"width": currentPlayProgress + "px"});
		var percent = (currentPlayProgress / barWidth) * 100;
		updateTracker(percent);
		if(currentPlayProgress < 50){
			$("." + event.type + " .playtime").css({
				"padding-left": (currentPlayProgress + 13) + "px",
				"color": "white"
			})
		}else{
			$("." + event.type + " .playtime").css({
				"padding-left": "initial",
				"color": "initial"
			})
		}
	}
};

var updateTracker = function(percent){
	if(isNaN(percent)){
		percent = 0;
	}
	$(".songtracker").slider("instance").value(percent);
};

//var updateCurrentDownload = function(event, data){
//	$(".songinfo ." + event.type).css({"width": data + "%"});
//};

var updateCurrentTime = function(data){
	$(".songinfo .playtime").empty().append(data);
};

var updateTotalTime = function(data){
	$(".songinfo .totaltime").empty().append(data);
};

var scrollToCurrentSong = function(animated){
	if(!playlist.currentSong)
		return;
	
	var currentSongUI = playlist.currentSong.getUI();
	if(!currentSongUI)
		return;
	
	if(animated)
		return $(".chosensongs")
			.animate({
				"scrollTop": (currentSongUI.index() * currentSongUI.outerHeight()) + "px"
			});
	
	$(".chosensongs").scrollTop(
		currentSongUI.index() * currentSongUI.outerHeight()
	);
};

var eventListener = function(event, data){
	changePlayButton(event.type);
	switch(event.type){
		case "ended":
			updateCurrentSongInfo();
			data && data.stopPlayUI();
			data && data.notCurrentUI();
			break;
		case "emptied":
			updateCurrentProgress($.Event("playprogress"), 0);
//			updateCurrentDownload($.Event("downloaded"), 0);
			break;
		case "pause":
			data && data.stopPlayUI();
			break;
		case "play":
			updateCurrentSongInfo(data);
			data && data.startPlayUI();
			data && data.isCurrentUI();
			scrollToCurrentSong(true);
			break;
//		case "downloaded":
//			data && updateCurrentDownload(event, data);
//			break;
		case "playprogress":
			data && updateCurrentProgress(event, data);
			break;
		case "currenttime":
			data && updateCurrentTime(data);
			break;
		case "songscleared":
			updateCurrentSongInfo();
			emptyListMessage();
			break;
		case "metadataloaded":
			data && updateCurrentSongInfo(data.song);
			data && updateTotalTime(data.duration);
			break;
		case "saveplaylist":
			playlist.saveList();
			break;
	}
};

var closeAllBranches = function(){
	$(".artist > .sub, .album > .sub, .song > .sub")
		.removeAttr("style")
		.addClass("hide")
		.empty();
	$(".addallbutton")
		.addClass("hide");
	$(".infobutton")
		.addClass("hide");
	$(".artist > .dir .diricon, .album > .dir .diricon")
		.addClass("fa-caret-right")
		.removeClass("fa-caret-down");
};

var refreshSongs = function(){
	var ts = new Date().getTime();
	ajaxWithOpts("/songs/refreshdata?_=" + ts, "GET", null, {}, null, function(data){
		var files = data.files.songs;
		var allIds = {};
		//add new items that are not in DOM
		for(var i = 0, l = files.length; i < l; ++i){
			var parsedData = parseSongData(files[i], i);
			allIds[parsedData.id] = 1;
			if(!$(".availablesongs #"+ parsedData.id).length){
				$(".availablesongs .artist")
					.eq(i)
					.before(displayFiles(parsedData));
			}
		}
		//remove items from DOM that are not in results
		$(".availablesongs .artist")
			.each(function(index, artistElem){
				if(!allIds[$(artistElem).attr("id")]){
					$(artistElem)
						.remove();
				}
			});
	});
};

var loadSongs = function(callback){
	buildArtists(function(files){
		togglePlaylists(false, true);
		$(".availablesongs")
			.empty()
			.append(
				$(files.songs).map(function(index, file){
					return displayFiles(parseSongData(file, index), null, files.images);
				})
			);
		callback && callback();
	});
};

var storage;
var setUpStorage = function(callback){
	storage = new SongStorage(un, service);
	storage.init(callback);
};

var options;
var setUpOptions = function(){
	options = new Options();
};

var toggleShowOptions = function(onOff){
	if(onOff == undefined){
		onOff = $(".options_panel").length == 0;
	}
	if(onOff){
		var allUserOptions = Options.allUserOptions;
		var content = $(ce("div"))
			.append(
				$(allUserOptions).map(function(i, option){
					return $(ce("div"))
						.addClass("option_container")
						.append(
							$(ce("div"))
								.addClass("option_title")
								.append(option.title, ":"),
							$(ce("div"))
								.addClass("option_check")
								.append(
									$(ce("input"))
										.attr({
											"type": "checkbox",
											"checked": options.getOption(option.variable)
										})
										.on("change", option.toggle)
								)
						)
						.get(0)
				}),
				$(ce("div"))
					.addClass("clear")
			);
		
		var optionsPanel = popUpPanel(
			"options_panel",
			"Queue Options",
			content,
			true
		);
		$("body")
			.append(optionsPanel);
		$(optionsPanel)
			.removeClass("hide");
	}else{
		$(".options_panel")
			.addClass("hide")
			.remove();
	}
};


var shortcutsList = [{
	"desc": "Pause/Unpause Playback",
	"keys": ["Space"]
},{
	"desc": "Restart Song",
	"keys": ["Ctrl", "Left"]
},{
	"desc": "Short Rewind",
	"keys": ["Left"]
},{
	"desc": "Long Rewind",
	"keys": ["Shift", "Left"]
},{
	"desc": "Short Fast Fwd",
	"keys": ["Right"]
},{
	"desc": "Long Fast Fwd",
	"keys": ["Shift", "Right"]
},{
	"desc": "Previous Song",
	"keys": ["Up"]
},{
	"desc": "Next Song",
	"keys": ["Down"]
},{
	"desc": "Scroll Up",
	"keys": ["Page Up"]
},{
	"desc": "Scroll Down",
	"keys": ["Page Down"]
},{
	"desc": "List Top",
	"keys": ["Home"]
},{
	"desc": "List End",
	"keys": ["End"]
},{
	"desc": "Clear Queue",
	"keys": ["Delete"]
},{
	"desc": "Toggle Download",
	"keys": ["Ctrl", "D"]
},{
	"desc": "Toggle Edit Mode",
	"keys": ["Ctrl", "E"]
},{
	"desc": "Filter/Search",
	"keys": ["Ctrl", "F"]
},{
	"desc": "Log Out",
	"keys": ["Ctrl", "L"]
},{
	"desc": "Save Playlist",
	"keys": ["Ctrl", "M"]
},{
	"desc": "Options",
	"keys": ["Ctrl", "O"]
},{
	"desc": "Show Playlists",
	"keys": ["Ctrl", "P"]
},{
	"desc": "Toggle Show Queue",
	"keys": ["Ctrl", "Q"]
},{
	"desc": "Refresh Available Song List",
	"keys": ["Ctrl", "R"]
},{
	"desc": "Close All Branches",
	"keys": ["-"]
},{
	"desc": "Show Help",
	"keys": ["?"]
},{
	"desc": "Close Various Tools",
	"keys": ["Esc"]
}];

var shortcutKeys = function(){
	$(document)
		.on("keydown", function(e){
			//console.log(e.which);
			if(e.which == 27){
				return setTimeout(escapeOptions, 200);
			}
			if($(':focus').not("input[type='checkbox']").length){
				return;
			}
			e.preventDefault();
			if(e.which < 191 && e.which >= 32){
				showHideButtonTitles(false);
			}
			var containerSelector = activePanel || (queueShown ? ".chosensongs" : ".availablesongs");
			switch(e.which){
				case 32:
					//space bar, start/stop
					playlist.togglePlay();
					break;
				case 33:
					//page up, scroll up
					$(containerSelector).scrollTop($(containerSelector).scrollTop() - 100);
					break;
				case 34:
					//page down, scroll down
					$(containerSelector).scrollTop($(containerSelector).scrollTop() + 100);
					break;
				case 35:
					//end, bottom of list
					var scrollLength;
					if(queueShown){
						scrollLength = playlist.list.length * 40;
					}else{
						scrollLength = $(".availablesongs").children().length * 52;
					}
					$(containerSelector).scrollTop(scrollLength);
					break;
				case 36:
					//home, top of list
					$(containerSelector).scrollTop(0);
					break;
				case 37:
					if(e.ctrlKey){
						//ctrl-left, restart
						playlist.restartSong();
					}else{
						//left, small rewind
						//shift-left big rewind
						var amt = 1;
						if(e.shiftKey){
							amt = 10;
						}
						playlist.setPercentDown(amt);
					}
					break;
				case 39:
					//right, small fast fwd
					//shift-right big fast fwd
					var amt = 1;
					if(e.shiftKey){
						amt = 10;
					}
					playlist.setPercentUp(amt);
					break;
				case 38:
					//up, prev song
					playlist.playPrevious();
					break;
				case 40:
					//down, next song
					playlist.playNext();
					break;
				case 46:
					//delete, clear list
					clearChosen();
					break;
				case 68:
					//ctrl-d, open download
					if(e.ctrlKey){
						setTimeout(toggleDownloadUtility, 200);
					}
					break;
				case 69:
					//ctrl-e, toggle edit mode (only if list not shown)
					if(e.ctrlKey && queueShown){
						editChosenSongs();
					}
					break;
				case 70:
					//ctrl-f, toggle filter (if list not shown)
					//open search (if list shown)
					if(e.ctrlKey){
						if(queueShown){
							setTimeout(openListFilter, 200);
						}
						if(!queueShown){
							setTimeout(openSearch, 200);
						}
					}
					break;
				case 76:
					//ctrl-l, log out
					if(e.ctrlKey){
						confirmLogout();
					}
					break;
				case 77:
					//ctrl-m, make playlist
					if(e.ctrlKey){
						makePlaylist();
					}
					break;
				case 79:
					//ctrl-o, toggle options
					if(e.ctrlKey && queueShown){
						toggleShowOptions();
					}
					break;
				case 80:
					//ctrl-p, toggle show playlists
					if(e.ctrlKey && !queueShown){
						$(".viewplaylist").data().activity(true);
						buildPlaylists(null, function(){
							$(".viewplaylist").data().activity(false);
						});
					}
					break;
				case 81:
					//ctrl-q, toggle show queue
					if(e.ctrlKey){
						changeMode(queueShown ? 0 : 1, true);
					}
					break;
				case 82:
					//ctrl-r, refresh available songs (only if list not shown)
					if(e.ctrlKey && queueShown){
						setTimeout(refreshSongs, 200);
					}
					break;
				case 189:
					//minus, close all branches (only if list not shown)
					if(!queueShown){
						setTimeout(closeAllBranches, 200);
					}
					break;
				case 191:
					//question mark key, show help text
					setTimeout(showButtonTitles, 200);
					break;
			}
		})
};

var toggleShowShortcutKeys = function(onOff){
	if(onOff == undefined){
		onOff = $(".shortcuts").length == 0;
	}
	if(onOff){
		var shortcutKeysPanel = popUpPanel(
			"shortcuts",
			"List of keyboard shortcuts",
			$(ce("div"))
				.append(
					$(shortcutsList).map(function(index, shortcut){
						return $(ce("div"))
							.addClass("shortcut_item")
							.append(
								$(ce("div"))
									.addClass("shortcut_key_container")
									.append(
										$(shortcut.keys).map(function(i, key){
											return $(ce("div"))
												.addClass("shortcut_key")
												.append(key)
												.get(0);
										})
									),
								" : ", 
								shortcut.desc
							)
							.get(0)
					}),
					$(ce("div"))
						.addClass("clear")
				), true
		);
		$("body")
			.append(shortcutKeysPanel);
		$(shortcutKeysPanel)
			.removeClass("hide");
	}else{
		$(".shortcuts")
			.addClass("hide")
			.remove();
	}
};

var makeTracker = function(){
	$(".songtracker")
		.slider({
			"slide": function(event, ui){
				playlist.setPercent(ui.value);
			},
			"stop": function(event, ui){
				$(ui.handle).blur();
			}
		});
};

var buildArtists = function(callback){
	var ts = new Date().getTime();
	ajaxWithOpts("/songs/get?_=" + ts, "POST", {}, {}, null, function(data){
		if(data && data.result == "ok"){
			callback(data.files);
		}
	});
};

var confirmLogout = function(){
	if(!confirm("Log out?"))
		return;
	logout();
};

var logout = function(){
	auth.logout();
};

var authCheck = function(callback){
	auth.authCheck(callback)
};

