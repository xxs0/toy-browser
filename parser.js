const EOF = Symbol("EOF");
let currentToken = null;

function emit(token) {
  if(token.type !== 'text') {
    console.log(token);
  }
}

function data(char) {
  if (char === '<') {
    return tagOpen;
  } else if (char === EOF) {
    emit({
      type: "EOF"
    });
    return;
  } else {
    emit({
      type: 'text',
      content: char
    })
    return data;
  }
}

function tagOpen(char) {
  if (char === '/') {
    return endTagOpen;
  } else if (char.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: 'starTag',
      tagName: ''
    }
    return tagName(char);
  } else {
    return;
  }
}

function endTagOpen(char) {
  if (char.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: 'endTag',
      tagName: ''
    }
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
    currentToken.tagName += char.toLowerCase();
    return tagName;
  } else if (char === '>') {
    emit(currentToken);
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