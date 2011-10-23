// Some nice LousyZell plugins for DOM acoplation
// Requieres: jQuery

$C = (function($Z) {
	var dom_methos = {

		/** Fundamental decorators **/

		connect: function (selector, base) {
			this._selector = selector;
			this._base_selector = base;
			this._find = (this._base_selector) ? $(this._base_selector).find : $;
			return this;
		},
		on: function (events) {
			is_array(events) || (events = [events]);
			this._events = events;
			var element = this._find(this._selector);
			var self = this;
			events.forEach(function(event) {
				element[event](function (e) {
					if (self._gatherer) { self(self._gatherer.call(this, e)); }
					else { self(this); }
				});
			});
			return this;
		},
		gather: function (func) {
			this._gatherer = func;
			return this;
		},
		set: function (func) {
			var elements = this._find(this._selector);
			this.listen(function(value) {
				elements.each(function (i, element) {
					func.call(element, value);
				});
			});
			return this;
		},
		
		/** Convenient predefined helpers **/

		get_value: function () {
			this._gatherer = function () { return $(this).val(); };
			return this;
		},
		set_value: function () {
			var setter = function(value) { $(this).val(value); };
			this.set(setter);
			return this;
		},
		value: function () {
			this.set_value();
			this.get_value();
			return this;
		},
		set_html: function () {
			var setter = function(value) { $(this).html(value); };
			this.set(setter);
			return this;
		},
		set_attr: function (attr) {
			var setter = function(value) { $(this).attr(attr, value); };
			this.set(setter);
			return this;
		},
		set_css: function (attr) {
			var setter = function(value) { $(this).css(attr, value); };
			this.set(setter);
			return this;
		},
    set_children: function () {
      var setter = function(children) { 
        var el = $(this);
        el.html("");
        el.append.apply(el, children); 
      };
      this.set(setter);
      return this;
    },
		toggle_class: function (class_name) {
			var setter = function(value) {
				var op = value? 'addClass' : 'removeClass';
				$(this)[op](class_name);
				console.log(op + ": " + class_name);
			};
			this.set(setter);
			return this;
		},
    show_hide: function () {
      var setter = function(value) { 
        if (value) $(this).show();
        else $(this).hide();
      };
      this.set(setter);
      return this;
    }

	};

	var $C = function() {
		var original = $Z.apply({}, arguments);
		return extend(original, dom_methos);
	};
	return extend($C, $Z);
})($C);
