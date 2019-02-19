
var Download = function(magnate){
	if(magnate)
		this.magnate = magnate;
	this.pid;
	this.stateTimer;
	this.percent = 0;
	this.status = "starting";
	this.filename = "Fetching filename...";
	this.listeners = {};
	this.monitor = true;
	this.error;
};

Download.prototype.startDownload = function(){
	var self = this;
	var ts = new Date().getTime();
	ajaxWithOpts("/songs/download?_=" + ts, "POST", {"magnate": this.magnate}, {}, null, function(data){
		if(data && data.result == "ok"){
			self.pid = data.pid;
			self.monitorDownload();
			self.eventListener($.Event("updated"));
		}
	});
};

Download.prototype.monitorDownload = function(){
	var self = this;
	var ts = new Date().getTime();
	if(self.monitor){
		return ajaxWithOpts("/songs/download/progress/"+ self.pid +"?_=" + ts, "GET", null, {}, function(a, b, c){
			if(a.status == 404){
				self.error = "Download not found.";
			}
		}, function(data){
			if(data && data.result == "ok"){
				if(data.percent)
					self.percent = data.percent;
				if(data.status)
					self.status = data.status;
				if(data.filename)
					self.filename = data.filename;
				if(data.error)
					self.error = data.error;
			}
			self.eventListener($.Event("updated"));
			if(self.status != "refreshed" && !data.error){
				self.stateTimer = setTimeout(function(){
					self.monitorDownload();
				}, 5000);
			}
		});
	}
	self.stateTimer = setTimeout(function(){
		self.monitorDownload();
	}, 5000);
};

Download.prototype.cancelDownload =  function(callback){
	var ts = new Date().getTime();
	ajaxWithOpts("/songs/download/cancel/"+ this.pid +"?_=" + ts, "GET", null, {}, null, callback);
};

Download.prototype.addListener = function(events, func, object){
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

Download.prototype.eventListener = function(event){
	debug && console.log("Download: ", event.type);
	
	switch(event.type){
		case "error":
			console.log("Error: ", event);
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


