// Some helpers

function extend(receiver, giver, props) {
  if (!props) {
    // not the most efficient way, because we are
    // transversing the property list twice!
    for (var prop in props) {
      props.push(prop);
    }
  }
  for (var i=0,_len=props.length; i<_len; i++) {
    var prop = props[i];
    if (receiver[prop] === undefined) {
      receiver[prop] = giver[prop];
    }
  }
  return receiver;
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

// LousyCell implementation

var Cell = (function () {
  var current_id = 0;

  function Cell(value) {
    this.id = current_id++;
    this.value = value;
    this.observers = [];
  };
  Cell.prototype = {
    get: function() { return this.value; },
    set: function(value) { 
      this.value = value;
      this.notify_change(this.id, value);
      return this.value;
    },
    push: function(value) {
      is_array(this.value) || (this.value = [this.value]);
      return this.value.push(value);
    },
    pop: function (value) {
      is_array(this.value) || (this.value = [this.value]);
      return this.value.pop(value);
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

var $C = function(arg1, arg2) {
  
  arg1 || (arg1 = '');

  var is_array = function(a) { return a.constructor == Array.prototype.constructor; }

  var attach_observer = function (cell_decorator, fn) {
    var callback = function() { fn(cell_decorator()); };
    var deps = cell_decorator._root_cells;
    for (var i=0, _len = deps.length; i < _len; i++) {
      var dep_cell = deps[i];
      dep_cell.observe(callback);
    }
  };

  var bind_cell = function (input, fn) {
    is_array(input) || (input = [input]);
    var decorator = function() {
      var values = input.map(function(c) { return c(); });
      return fn ? fn.apply({}, values) : values[0];
    }
    decorator._is_cell = true;
    decorator._root_cells = input.reduce(function (r, c) { return r.concat(c._root_cells); }, []);
    decorator._root_cells = unique(decorator._root_cells);
    decorator._dependencies = input;
    decorator.listen = function (fn) { return attach_observer(decorator, fn); }
    return decorator;
  };

  var connect_to_selector = function(input_cell, selector, options) {
    var input = document.getElementById(selector);
    var event = 'onchange';
    var change_func = function() { input_cell(input.value); };
    if (input.type == 'text' || input.type == 'textarea') {
      event = 'onkeyup';
      cahnge_func = debounce(change_func, 500);
    }
    input[event] = change_func;
    return input_cell;
  };

  var create_input_cell = function (value, getter_filter) {
    var cell = new Cell(value);
    var decorator = function (new_value) {
      if (new_value !== undefined) { return cell.set(new_value);}
      else { return getter_filter ? getter_filter(cell.get()) : cell.get(); }
    }
    extend(decorator, cell, ['push', 'pop']);
    decorator._is_cell = true;
    decorator._root_cells = [cell];
    decorator.connect = function (selector, options) { return connect_to_selector(decorator, selector, options); };
    return decorator;
  };

  if (arg1._is_cell || (is_array(arg1) && typeof(arg2) == 'function')) {
    return bind_cell(arg1, arg2);
  } else {
    return create_input_cell(arg1, arg2);
  };
};

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
