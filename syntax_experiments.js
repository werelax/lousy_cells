$C = require('./lousy_cells').$C;
is_array = require('./lousy_cells').is_array;

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
    connect_input: function(selector) {
      this._selector = selector;
    },
    on_event: function(events) {
      if (!is_array(events)) events = [events];
      var self = this;
      events.forEach(function(event) {
        $(self._selector)[event](function() {
          if (self._gatherer) {
            self._cell(self._gatherer.call(this))
          }
        });
      });

    },
    gather: function(func) {
    }
  };
  var output_decorator = {
  };
  var decorator = {
    connect_input: function(selector) {
      unextend(this, decorator);
      return extend(this, input_decorator);
    },
    connect_output: function(selector) {
      unextend(this, decorator);
      return extend(this, output_decorator);
    }
  };

  var DecoratedCell = function() {
    var cell = $C.apply({}, arguments);
    decorated_cell = {_cell: cell};
    return extend(decorated_cell, decorator);
  }
  return DecoratedCell;
})($C);

// What I'm looking for

var cell1 = $C('default value')
  .connect_input('#selector')
  .on_event(['mouseover', 'mouseout'])
  .gather(function() { return $(this).val(); });

var cell2 = $C(cell1)
  .connect_output('#output_selector')
  .get_value();
var cell3 = $C(cell1, function(c1) { return c1 ? 'block':'auto'} )
  .connect_output('#output_selector')
  .set_css('display');
var cell4 = $C(cell2)
  .connect_output('#other_output')
  .set(function (value) { $(this).css('color', value); });

