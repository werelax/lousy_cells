// $C = require('./lousy_cells').$C;
// is_array = require('./lousy_cells').is_array;

var is_array = function(a) { return a.constructor == Array.prototype.constructor; }

function extend(receiver, giver) {
  for (var prop in giver) {
    if (receiver[prop] === undefined) {
      receiver[prop] = giver[prop];
    }
  }
  return receiver;
}
function unextend(receiver, taker) {
  for (var prop in taker) if (taker.hasOwnProperty(prop)) {
    if (receiver[prop] !== undefined) delete receiver[prop];
  }
  return receiver;
}

$C = (function($C) {
  var input_decorator = {
    on_event: function(events) {
      if (!is_array(events)) events = [events];
      var self = this;
      var element = $(self._selector);
      events.forEach(function(event) {
        element[event](function(e) {
          if (self._gatherer) { self(self._gatherer.call(this, e)); }
          else { self(this); }
        });
      });
      return this;
    },
    gather: function(func) {
      this._gatherer = func;
      return this;
    },
    /** precooked gatherers **/
    getValue: function () {
      this._gatherer = function() { return $(this).val(); }
      return this;
    }
  };
  var output_decorator = {
    set: function(func) {
      var elements = $(this._selector);
      this.listen(function() {
        var values = Array.prototype.splice.call(arguments, 0);
        elements.each(function(i, element) {
          func.call(element, values);
        });
      });
      return this;
    },

    /** precooked setters **/
    set_html: function() {
      var setter = function(values) { $(this).html(values[0]); };
      this.set(setter);
      return this;
    },
    set_css: function(attr) {
      var setter = function(values) { $(this).css(attr, values[0]); };
      this.set(setter);
      return this;
    },
    set_attr: function(attr) {
      var setter = function(values) { $(this).attr(attr, values[0]); };
      this.set(setter);
      return this;
    }
  };
  var decorator = {
    connect_input: function(selector) {
      unextend(this, decorator);
      this._selector = selector;
      return extend(this, input_decorator);
    },
    connect_output: function(selector) {
      unextend(this, decorator);
      this._selector = selector;
      return extend(this, output_decorator);
    }
  };

  var DecoratedCell = function() {
    var cell = $C.apply({}, arguments);
    return extend(cell, decorator);
  }
  return DecoratedCell;
})($C);

// What I'm looking for
/**

var cell1 = $C('default value')
  .connect_input('#selector')
  .on_event(['mouseover', 'mouseout'])
  .gather(function() { return $(this).val(); });

var cell2 = $C(cell1)
  .connect_output('#output_selector')
  .set_value();
var cell3 = $C(cell1, function(c1) { return c1 ? 'block':'auto'} )
  .connect_output('#output_selector')
  .set_css('display');
var cell4 = $C(cell2)
  .connect_output('#other_output')
  .set(function (value) { $(this).css('color', value); });

**/
