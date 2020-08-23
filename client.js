const net = require('net');

class Request {
  constructor(options) {
    this.method = options.method || 'GET';
    this.host = options.host;
    this.port = options.port || 80;
    this.path = options.path || '/';
    this.headers = options.headers || {};
    this.body = options.body || {};

    if (!this.headers['Content-Type']) {
      this.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    if (this.headers['Content-Type'] === 'application/json') {
      this.bodyText = JSON.stringify(this.body);
    } else if (this.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
      this.bodyText = Object.keys(this.body)
        .map((key) => key + '=' + encodeURIComponent(this.body[key]))
        .join('&');
    }
  }

  toString() {
    //拼接格式很重要
    let headersString = Object.keys(this.headers)
      .map((key) => key + ': ' + this.headers[key])
      .join('\r\n');
    return `${this.method} ${this.path} HTTP/1.1\r\n${headersString}\r\n\r\n${this.bodyText}`;
  }

  send(connection) {
    return new Promise((resolve, reject) => {
      let parser = new ResponseParser();
      if (connection) {
        connection.write(this.toString());
      } else {
        connection = net.createConnection(
          {
            host: this.host,
            port: this.port,
          },
          () => {
            connection.write(this.toString());
          }
        );
      }
      connection.on('data', (data) => {
        // 流式传输，data很可能不是一次过来
        // data触发事件，1.从网卡接数据，数据满了。2.收到服务端IP包
        parser.receive(data.toString());
        if (parser.isFinished) {
          resolve(parser.response);
        }
        connection.end();
      });
      connection.on('end', () => {
        console.log('disconnected from server');
      });
      connection.on('error', () => {
        reject();
        connection.end();
      });
    });
  }
}

class ResponseParser {
  constructor() {
    this.WAIT_STATUS_LINE = 0;
    this.WAIT_STATUS_LINE_END = 1;
    this.WAIT_HEADER_NAME = 2;
    this.WAIT_HEADER_SPACE = 3;
    this.WAIT_HEADER_VALUE = 4;
    this.WAIT_HEADER_LINE_END = 5;
    this.WAIT_HEADER_BLOCK_END = 6;
    this.WAIT_BODY = 7;

    this.currentStatus = this.WAIT_STATUS_LINE;
    this.statusLine = '';
    this.headers = {};
    this.headerName = '';
    this.headerValue = '';
    this.bodyParser = null;
  }

  get isFinished() {
    return this.bodyParser && this.bodyParser.isFinieshed;
  }

  get response() {
    this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/);
    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2,
      headers: this.headers,
      body: this.bodyParser.content.join('')
    }
  }

  receive(string) {
    for (let i = 0; i < string.length; i++) {
      this.receiveChar(string.charAt(i));
    }
  }

  receiveChar(char) {
    if (this.currentStatus === this.WAIT_STATUS_LINE) {
      if (char === '\r') {
        this.currentStatus = this.WAIT_STATUS_LINE_END;
      } else if (char === '\n') {
        this.currentStatus = this.WAIT_HEADER_NAME;
      } else {
        this.statusLine += char;
      }
    } else if (this.currentStatus === this.WAIT_STATUS_LINE_END) {
      if (char === '\n') {
        this.currentStatus = this.WAIT_HEADER_NAME;
      }
    } else if (this.currentStatus === this.WAIT_HEADER_NAME) {
      if (char === ':') {
        this.currentStatus = this.WAIT_HEADER_SPACE;
      } else if (char === '\r') {
        this.currentStatus = this.WAIT_HEADER_BLOCK_END;
        if (this.headers['Transfer-Encoding'] === 'chunked') {
          this.bodyParser = new TrunkedBodyParser();
        }
      } else {
        this.headerName += char;
      }
    } else if (this.currentStatus === this.WAIT_HEADER_SPACE) {
      if (char === ' ') {
        this.currentStatus = this.WAIT_HEADER_VALUE;
      }
    } else if (this.currentStatus === this.WAIT_HEADER_VALUE) {
      if (char === '\r') {
        this.currentStatus = this.WAIT_HEADER_LINE_END;
        this.headers[this.headerName] = this.headerValue;
        this.headerName = '';
        this.headerValue = '';
      } else {
        this.headerValue += char;
      }
    } else if (this.currentStatus === this.WAIT_HEADER_LINE_END) {
      if (char === '\n') {
        this.currentStatus = this.WAIT_HEADER_NAME;
      }
    } else if (this.currentStatus === this.WAIT_HEADER_BLOCK_END) {
      if (char === '\n') {
        this.currentStatus = this.WAIT_BODY;
      }
    } else if (this.currentStatus === this.WAIT_BODY) {
      this.bodyParser.receiveChar(char);
    }
  }
}

class TrunkedBodyParser {
  constructor() {
    this.WAIT_LENGTH = 0;
    this.WAIT_LENGTH_LINE_END = 1;
    this.READ_TRUNK = 2;
    this.WAIT_NEW_LINE = 3;
    this.WAIT_NEW_LINE_END = 4;
    this.length = 0;
    this.content = [];
    this.isFinieshed = false;

    this.currentStatus = this.WAIT_LENGTH;
  }

  receiveChar(char) {
    // chunked特点，每个chunked是一行一个字母，开头显示字符数，最后以0结束
    if (this.currentStatus === this.WAIT_LENGTH) {
      if (char === '\r') {
        if (this.length === 0) {
          this.isFinieshed = true;
        }
        this.currentStatus = this.WAIT_LENGTH_LINE_END;
      } else {
        this.length *= 16;
        this.length += parseInt(char, 16);
      }
    } else if (this.currentStatus === this.WAIT_LENGTH_LINE_END) {
      if (this.length === 0) {
        return;
      }
      if (char === '\n') {
        this.currentStatus = this.READ_TRUNK;
      }
    } else if (this.currentStatus === this.READ_TRUNK) {
      this.content.push(char);
      this.length--;
      if (this.length === 0) {
        this.currentStatus = this.WAIT_NEW_LINE;
      }
    } else if (this.currentStatus === this.WAIT_NEW_LINE) {
      if (char === '\r') {
        this.currentStatus = this.WAIT_NEW_LINE_END;
      }
    } else if (this.currentStatus === this.WAIT_NEW_LINE_END) {
      if (char === '\n') {
        this.currentStatus = this.WAIT_LENGTH;
      }
    }
  }
}

void async function() {
  let request = new Request({
    method: 'POST',
    host: '127.0.0.1',
    port: 3000,
    headers: {
      ['X-Foo2']: 'customed',
    },
    body: {
      name: 'foo',
    },
  });
  let response = await request.send();
  console.log(response)
}();