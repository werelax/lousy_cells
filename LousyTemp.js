function LousyTemp(text) {
  var code = '%>' + text + '<%';
  code = code
    .replace(/[\n\r\t]/g," ")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/<%=(.*?)%>/g, "', $1, '")
    .replace(/%>(.*?)<%/g, "_t_.push('$1'); ");
  code = "var _t_ = []; with(obj) {" + code + "}; return _t_.join('');";
  return new Function('obj', code);
}
