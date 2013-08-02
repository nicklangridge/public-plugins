// $Revision$

// FIXME: history isn't working properly when zooming in/out with slider - genoverse.length changes and everything is reset
// FIXME: occasional off-by-one error due to Math.round in getLocation - breaks history (and anything else that requires an x.start === y.start type comparison)
// TODO:  hide highlightRegion when new images are being made, and in other scenarios where it looks bad

Ensembl.Genoverse = Genoverse.extend({
  init: function () {
    this.base();
    this.highlightRegion = $('<div class="selector highlight">').appendTo(this.wrapper);
    
    Ensembl.EventManager.register('genoverseMove', this, this.moveTo);
    
    // Ensure that the popState function from Genoverse fires before the one from Ensembl, so that nothing happens when hashChange is triggered from using browser forward/back buttons
    $(window).off('hashchange.ensembl popstate.ensembl').on('hashchange.ensembl popstate.ensembl', $.proxy(Ensembl.LayoutManager.popState, Ensembl.LayoutManager));
    this.container.off('dblclick');
  },
  
  updateEnsembl: function () {
    Ensembl.images[this.panel.imageNumber][0][2] = this.start;
    Ensembl.images[this.panel.imageNumber][0][3] = this.end;
    
    if (this.dragging) {
      var location = this.getLocation(this.start, this.end, Ensembl.location.length);
      var text     = Ensembl.thousandify(location.start) + '-' + Ensembl.thousandify(location.end); 
      
      (this.updateEnsemblText = this.updateEnsemblText || $('h1.summary-heading, #masthead .location.long_tab a')).html(function (i, html) {
        return html.replace(/^(.+:\s?).+/, '$1' + text);
      });
    }
    
    Ensembl.EventManager.trigger('highlightAllImages');
  },
  
  updateURL: function (location) {
    location = location || (this.prev.scale === this.scale ? this.getLocation(this.start, this.end, Ensembl.location.length) : this);
    
    if (Ensembl.location.start === location.start && Ensembl.location.end === location.end) {
      return;
    }
    
    this.updatingURL = true;
    
    Ensembl.updateLocation(this.urlParamTemplate
      .replace('r=',        '')
      .replace('__CHR__',   this.chr)
      .replace('__START__', location.start)
      .replace('__END__',   location.end)
    );
  },
  
  popState: function () {
    this.updatingURL     = true;
    Ensembl.historyReady = true;
    this.base();
  },
  
  setRange: function (start, end, update, force) {
    var location = this.getLocation(start, end); // Ensures that minSize is observed
    this.base(location.start, location.end, update, force);
  },
  
  getLocation: function (s, e, l) {
    var browser     = this;
    var start       = Math.floor(s || this.start);
    var end         = Math.floor(e || this.end);
    var length      = end - start + 1;
    var flankLength = this.flanking ? Ensembl.location.length + (2 * this.flanking) : 0;
    
    // make the region be the length of newLength
    function resize(newLength) {
      if (length === newLength) {
        return;
      }
      
      start = Math.max(Math.round(start + (length - newLength) / 2), 1);
      end   = start + newLength - 1;
      
      if (end > browser.chromosomeSize) {
        end   = browser.chromosomeSize;
        start = end - browser.minSize + 1;
      }
    }
    
    if (l) {
      resize(l);
    } else if (flankLength && flankLength <= this.minSize && flankLength <= this.chromosomeSize) {
      // expand the region by flanking amount on each side
      resize(flankLength);
    } else if (this.minSize && length < this.minSize) {
      if (this.chromosomeSize < this.minSize) {
        // get whole chromosome
        start = 1;
        end   = this.chromosomeSize;
      } else {
        resize(this.minSize);
      }
    }
    
    return { start: start, end: end, length: end - start + 1 };
  },
  
  stopDragScroll: function () {
    Ensembl.genoverseScroll = true;
    this.base.apply(this, arguments);
    Ensembl.genoverseScroll = false;
  },
  
  moveTo: function (location, urlLocation) {
    var start = Math.max(typeof location.start === 'number' ? location.start : parseInt(location.start, 10), 1);
    var end   = Math.min(typeof location.end   === 'number' ? location.end   : parseInt(location.end,   10), this.chromosomeSize);
    var left  = Math.round((start - this.start) * this.scale);
    var width = Math.round((end   - start + 1)  * this.scale);
    
    this.startDragScroll();
    this.move((this.width - width) / 2 - left);
    this.stopDragScroll(false);
    this.checkTrackHeights();
    
    if (urlLocation) {
      this.updateURL(urlLocation === true ? this.getLocation(start, end, Ensembl.location.length) : urlLocation);
    }
  },
  
  setLabels: function (tracks) {
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].label.hasClass(tracks[i].urlParams.id)) {
        continue;
      }
      
      tracks[i].label.data({ order: tracks[i].order || 0 }).addClass(tracks[i].urlParams.id);
      
      if (tracks[i].unsortable !== true) {
        if (tracks[i].strand) {
          tracks[i].label.addClass(tracks[i].strand === 1 ? 'f' : 'r');
        }
      }
    }
  },
  
  setTracks: function () {
    var tracks = this.base.apply(this, arguments);
    this.setLabels(tracks);
    return tracks;
  },
  
  removeTracks: function (tracks) {
    var hover = $.map(tracks, function (track) { return (track.hoverLabel || [])[0]; });
    this.panel.elLk.hoverLabels = this.panel.elLk.hoverLabels.not($(hover).remove());
    this.base(tracks);
  },
  
  updateTrackOrder: function (e, ui) {
    this.base(e, ui);
    
    var track  = ui.item.data('track');
    
    $.ajax({
      url  : '/' + Ensembl.species + '/Ajax/track_order',
      type : 'post',
      data : {
        image_config : this.panel.imageConfig,
        track        : track.id,
        order        : track.order
      }
    });
    
    Ensembl.EventManager.triggerSpecific('changeTrackOrder', 'modal_config_' + this.panel.id.toLowerCase(), track.id, track.order);
  },
  
  resetConfig: function () {
    this.resetTrackHeights();
    
    for (var i = 0; i < this.tracks.length; i++) {
      this.tracks[i].messageContainer.attr('class', 'message_container expanded');
    }
  },
  
  resetTrackHeights: function () {
    var track;
    
    this.autoHeight = false;
    
    this.base();
    
    this.panel.elLk.autoHeight.removeClass('off');
    this.panel.changeControlTitle('autoHeight');
    
    for (var i = 0; i < this.tracks.length; i++) {
      track = this.tracks[i];
      
      if (track.resizable) {
        track.updateHeightToggler();
      }
    }
  },
  
  toggleAutoHeight: function (json) {
    var i = this.tracks.length;
    var track, height;
    
    this.autoHeight = !this.autoHeight;
    
    while (i--) {
      track = this.tracks[i];
      
      if (track.resizable) {
        track.autoHeight = !!json[track.id].autoHeight || this.autoHeight;
        
        if (track.autoHeight) {
          track.heightBeforeToggle = track.height;
          height = track.fullVisibleHeight;
        } else {
          height = json[track.id].height || track.initialHeight;
        }
        
        if (json[track.id].height) {
          track.heightBeforeToggle = json[track.id].height;
        }
        
        track.resize(height);
        track.updateHeightToggler();
      }
    }
  },
  
  updateSelectorHeight: function () {
    if (this.resizingTracks || this.dragging) {
      return;
    }
    
    var height = 0;
    var i      = this.tracks.length;
    
    while (i--) {
      if (this.tracks[i].height && !(this.tracks[i] instanceof Genoverse.Track.Legend)) {
        height += this.tracks[i].height;
      }
    }
    
    this.selector.add(this.highlightRegion).height(height);
  },
  
  makeMenu: function (feature, event, track) {
    if (feature.menu || feature.title) {
      this.makeZMenu({ event: event, feature: feature, imageId: track.name }, [ 'zmenu', track.name, feature.id ].join('_').replace(/\W/g, '_'), track);
      event.originalEvent.hasFeature = true;
    }
  },
  
  stopDragSelect: function (e) {
    if (this.base(e) !== false && !e.originalEvent.hasFeature) {
      var left  = this.selector.position().left;
      var start = Math.round(left / this.scale) + this.start;
      var end   = Math.round((left + this.selector.outerWidth(true)) / this.scale) + this.start - 1;
          end   = end <= start ? start : end;
      
      this.makeZMenu({ event: e, feature: {}, drag: { chr: this.chr, start: start, end: end, browser: this }, imageId: this.panel.id }, 'zmenu_region_select');
    }
  },
  
  makeZMenu: function (params, id, track) {
    params.browser = this;
    params.coords  = {};
    params.group   = params.feature.group || (track && track.depth === 1);
    
    if ((params.event.shiftKey || params.group) && params.event.pageX && !params.drag) {
      var x         = (params.event.pageX - this.wrapper.offset().left + this.scaledStart) / this.scale;
      var fuzziness = this.scale > 1 ? 0 : 2 / this.scale;
      
      params.coords.clickChr   = this.chr;
      params.coords.clickStart = Math.max(Math.floor(x - fuzziness), this.start);
      params.coords.clickEnd   = fuzziness ? Math.min(Math.ceil(x + fuzziness), this.end) : params.coords.clickStart;
      
      id += '_multi';
    }
    
    var menu = $('#' + id);
    
    if (!menu.length) {
      menu = Ensembl.Panel.ZMenu.template.clone().attr('id', id).addClass('menu').appendTo('body');
    }
    
    Ensembl.EventManager.trigger('addPanel', id, 'GenoverseMenu', undefined, undefined, params, 'showExistingZMenu');
    
    this.panel.zMenus[id] = 1;
    this.menus = this.menus.add(menu);
    
    if (track) {
      track.menus = track.menus.add(menu);
    }
    
    menu = null;
  },
  
  toggleSelect: function (on) {
    this.base(on);
    this.panel.elLk.dragging.removeClass('on off').addClass(this.dragAction === 'select' ? 'off' : 'on');
    this.panel.changeControlTitle('dragging');
  },
  
  keydown: function (e) {
    return e.which === 27 ? false : this.base(e); // Don't do anything on escape key press
  },
  
  saveConfig: function () {
    var track  = arguments[arguments.length - 1];
    var config = {};
    
    if (typeof arguments[0] === 'string') {
      config[arguments[0]] = arguments[1];
    } else {
      config = arguments[0];
    }
    
    $.ajax({
      url  : '/' + Ensembl.species + '/Genoverse/save_config',
      type : 'post',
      data : { config: JSON.stringify(config), image_config: this.panel.imageConfig, track: track instanceof Genoverse.Track ? track.id : '' }
    });
  },
  
  die: function (error, el) {
    return this.base(error, el.parents('.js_panel:first'));
  }
});

Genoverse.on('afterSetRange afterPopState', function () {
  this.updateEnsembl();
});

Genoverse.on('beforeResetTrackHeights beforeToggleAutoHeight beforeCheckTrackSize', function () {
  this.resizingTracks = true;
});

Genoverse.on('afterResetTrackHeights afterToggleAutoHeight afterCheckTrackSize', function () {
  this.resizingTracks = false;
  this.updateSelectorHeight();
});

Genoverse.on('afterAddTracks afterRemoveTracks', function () {
  Ensembl.EventManager.trigger('resetImageOffset');
  this.updateSelectorHeight();
});
