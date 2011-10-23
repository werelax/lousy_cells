$C = (function ($Z) {
	
	// Dependency tracking zells
	
	var has_more_keys_than = function (obj, n) {
		var counter;
		for (var p in obj) if ( obj.hasOwnProperty(p) ) {
			counter++;
			if (counter > n) { return true; }
		}
		return false;
	};
	
	var activated_cells = [];

	var $C = function(options) {
		var args = Array.prototype.splice.call(arguments, 0);
		if (options 
				&& typeof(options) == 'object' 
				&& ('read' in options)
			 	&& !has_more_keys_than(options, 3)) {
			// Probably, 'options' is describing a cell
			activated_cells = [];
			var owner = options.owner || {};
			try {
				options.read.call(owner);
			} catch (e) {
				throw new Error("Bad reader!");
			}
			var dependencies = activated_cells.splice(0);
			args.unshift(dependencies);
		}
		var original = $Z.apply({}, args);
		var decorated = function() {
			activated_cells.push(original);
			return original.apply({}, arguments);
		};
		extend(decorated, original);
		return decorated;
	};

	return extend($C, $Z);
})($C);
