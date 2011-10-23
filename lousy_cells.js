// Some helpers

function bind(func, context) {
  return function () { return func.apply(context, arguments); };
}

function is_array(a) {
  return a.constructor == Array.prototype.constructor;
}

function extend(receiver, giver, options) {
  options || (options = {});
  var binded    = options.binded    || false; 
  var props     = options.only      || false;
  var overwrite = options.overwrite || false; 

  if (!props) {
    // not the most efficient way, because we are
    // transversing the property list twice!
    props = [];
    for (var prop in giver) {
      props.push(prop);
    }
  }
  for (var i=0,_len=props.length; i<_len; i++) {
    var prop = props[i];
    if (overwrite || receiver[prop] === undefined) {
      receiver[prop] = (binded ? bind(giver[prop], giver) : giver[prop]);
    }
  }
  return receiver;
}

function clean(target, properties, default_value) {
  for (var i=0,_len=properties.length; i<_len; i++) {
    var prop = properties[i];
    target[prop] = default_value;
  }
  return target;
}

function unique (array) { 
  var a = [];
  var l = array.length;
  for(var i=0; i<l; i++) {
    for(var j=i+1; j<l; j++) {
      // If array[i] is found later in the array
      if (array[i] === array[j])
        j = ++i;
    }
    a.push(array[i]);
  }
  return a;
}

var debounce = (function() {
  var limit = function(func, wait, debounce) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var throttler = function() {
        timeout = null;
        func.apply(context, args);
      };
      if (debounce) clearTimeout(timeout);
      if (debounce || !timeout) timeout = setTimeout(throttler, wait);
    };
  };

  return function(func, wait) { return limit(func, wait, true); };
})();

function decorator_for(klass, name) {
  var original = name || klass.name.toLowerCase();
  var new_prot = {};
  for (var prop in klass.prototype) {
    new_prot[prop] = (function (prop) {
      return function() {
        var decorated = this[original];
        return decorated[prop].apply(decorated, arguments);
      }
    })(prop);
  }
  return new_prot;
}

// LousyCell implementation

var Cell = (function () {
  var current_id = 0;

  function Cell(value) {
    value || (value = '');
    this.id = current_id++;
    this.value = value;
    this.observers = [];
  };
  Cell.prototype = {
    constructor: Cell,
    get: function() {
      return this.value; 
    },
    set: function(value) { 
      this.value = value;
      this.notify_change(this.id, value);
      return this.value;
    },
    observe: function(callback) {
      this.observers.push(callback);
      this.ovservers = unique(this.observers);
    },
    notify_change: function() {
      for (var i=0, _len=this.observers.length; i < _len; i++) {
        var observer = this.observers[i];
        if (observer) try {
          this.observers[i].call(this.value);
        } catch (e) { }
      }
    }
  };
  return Cell;
})();

function ArrayCell(cell) {
  if (cell == undefined) return new ArrayCell(new Cell());
  if (!is_array(cell.value)) { cell.set([]); }
  this.cell = cell;
};
ArrayCell.prototype = decorator_for(Cell);
extend(ArrayCell.prototype, {
  constructor: ArrayCell,
  set: function(value) {
    this.cell.value = (is_array(value) ? value : [value]);
  },
  // I could implement a LOT of other interesting array operators
  // as decorated methods (maybe using underscore)
  push: function(value) {
    is_array(this.cell.value) || (this.cell.value = [this.cell.value]);
    this.cell.value.push(value);
    this.cell.notify_change(this.cell.id, this.cell.value);
    return this.cell.value;
  },
  pop: function () {
    is_array(this.cell.value) || (this.cell.value = [this.cell.value]);
    var value = this.cell.value.pop();
    this.cell.notify_change(this.cell.id, this.cell.value);
    return value;
  },
  remove: function(item) {
    var idx = this.cell.value.indexOf(item); 
    if (idx > -1) {
      this.cell.value.splice(idx, 1);
    }
    this.cell.notify_change(this.cell.id, this.cell.value);
    return this.cell.value;
  }
}, {overwrite: true});

// $C facade

var LousyZells = function(arg1, arg2) {
  
  arg1 || (arg1 = '');

  // only used to set the constructors of decorators
  function DecoratedCell() { };

  var attach_observer = function (cell_decorator, fn) {
    var callback = function() { fn(cell_decorator()); };
    var deps     = cell_decorator._root_cells;
    for (var i=0,_len=deps.length; i<_len; i++) {
      deps[i].observe(callback);
    }
    return cell_decorator;
  };

  var bind_cell = function (input, readfn, writefn, owner) {
    is_array(input) || (input = [input]);
    owner || (owner = {});
    var decorator_read = function () {
      var values = input.map(function(c) { return c(); });
      return readfn ? readfn.apply(owner, values) : values[0];
    }
    var decorator_write = function (new_value) {
      if (writefn) {
        var args = [new_value];
        args = args.concat(input);
        return writefn.apply(owner, args);
      } else {
        // special case: one input, no writefn
        if (input.length == 1) return input[0](new_value);
      }
    };
    var decorator = function(new_value) {
      if (new_value !== undefined) return decorator_write(new_value);
      else return decorator_read();
    };
    decorator.listen = function (fn) { return attach_observer(decorator, fn); }
    decorator.constructor = DecoratedCell;
    decorator._root_cells = input.reduce(function (r, c) { return r.concat(c._root_cells); }, []);
    decorator._root_cells = unique(decorator._root_cells);
    decorator._dependencies = input;
    return decorator;
  };

  var create_input_cell = function (value) {
    var cell      = new Cell(value);
    var decorator = function (new_value) {
      if (new_value !== undefined) {
        return cell.set(new_value);
      } else {
        return cell.get(); 
      }
    }
    if (is_array(value)) {
      cell = new ArrayCell(cell);
      extend(decorator, decorator_for(ArrayCell, 'cell'));
    } else {
      extend(decorator, decorator_for(Cell));
    }
    // remove implementation details form de decorator
    clean(decorator, ['get', 'set', 'observe', 'notify_change']);
    decorator.cell        = cell;
    // Identification of cells
    decorator.constructor = DecoratedCell;
    // Dependencies
    decorator._root_cells = [cell];
    // Operations
    decorator.listen = function (fn) { return attach_observer(decorator, fn); }
    return decorator;
  };

  // Overloading bullshit...

  var arg1_is_cell   = arg1.constructor.name.match(/DecoratedCell/);
  var arg1_is_cel_or_array = arg1_is_cell || is_array(arg1);
  var arg2_is_func   = ( typeof(arg2) == 'function' );
  var arg2_is_object = ( typeof(arg2) == 'object' );

  if (!arg2 && !arg1_is_cell) {
    // the only possible way to make an input cell
    return create_input_cell(arg1);
  } else if (!arg2) {
    // just a copy cell
    return bind_cell(arg1);
  } else if (arg2_is_func) {
    // base cell/cells + getter_filter
    return bind_cell(arg1, arg2);
  } else if (arg2_is_object) {
    // base cell/cells + options object
    var readfn  = arg2.read;
    var writefn = arg2.write;
    var owner   = arg2.owner;
    return bind_cell(arg1, readfn, writefn, owner);
  } else {
    throw new Error("Don't know what to do with that arguments...");
  }
};

// 'Static' LosyZells methods
extend(LousyZells, {
});

var $C = LousyZells;

/** Example:

var input_cell = $C('Hello');

var cell1 = $C(input_cell);
console.log('cell1: ' + cell1());
// "cell1: Hello"

var cell2 = $C(input_cell, function(cell) { return cell + ", I said."});
console.log('cell2: ' + cell2());
// "cell2: Hello, I said."

var cell3 = $C([cell1, cell2], function(c1, c2) { return c1 + ". " + c2; });
console.log('cell3: ' + cell3());
// "cell3: Hello. Hello, I said."

$C(cell3).listen(function(value) {
  console.log('cell3 changed to: ' + value);
});

input_cell('Goodbye');
// "cell3 changed to: Goodbye. Goodbye, I said."

/** Another example with multiple input cells

var ic1 = $C(10);
var ic2 = $C(5);
var ic3 = $C(200);

var result = $C([ic1, ic2, ic3], function(v1, v2, v3) { return v1 + v2 + v3});

$C(result).listen(function(result) {
  console.log("Result changed to: " + result);
});

console.log("At the start, result is: " + result());
// "At the start, result is: 215"

ic1(0);
// Result changed to: 205
ic2(1000);
// Result changed to: 1200
ic3(-1123);
// Result changed to: -123

**/
