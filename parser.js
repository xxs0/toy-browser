const EOF = Symbol("EOF");
let currentToken = {};
function data(char) {
  if (char === '<') {
    return tagOpen;
  } else if (char === EOF) {
    return;
  } else {
    return data;
  }
}

function tagOpen(char) {
  if (char === '/') {
    return endTagOpen;
  } else if (char.match(/^[a-zA-Z]$/)) {
    return tagName(char);
  } else {
    return;
  }
}

function endTagOpen(char) {
  if (char.match(/^[a-zA-Z]$/)) {
    return tagName(char);
  } else if (char == '>') {
    return data;
  } else if (char === EOF) {

  } else {

  }
}

function tagName(char) {
  if (char.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (char ==='/') {
    return selfCloseStartTag;
  } else if (char.match(/^[a-zA-Z]$/)) {
    return tagName;
  } else if (char === '>') {
    return data;
  } else {
    return tagName;
  }
}

function beforeAttributeName(char) {
  if (char.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (char === '>') {
    return data;
  } else if (char === '=') {
    return beforeAttributeName;
  } else {
    return beforeAttributeName;
  }
}


function selfCloseStartTag(char) {
  if (char === '>') {
    currentToken.isSelfClosing = true;
    return data;
  } else if (char === EOF) {

  } else {

  }
}

module.exports.parseHTML = function parseHTML(html) {
  let state = data;
  for (let el of html) {
    state = state(el);
  }
  state = state(EOF);
}