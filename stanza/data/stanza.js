function Stanza(execute) {
  var proto = Object.create(HTMLElement.prototype);
  var development = descriptor.development;

  function template(name) {
    var t = descriptor.templates[name];
    if (!t) {
      throw new Error("template \"" + name + "\" is not found");
    }
    return t;
  }

  function createStanzaHelper(element) {
    return {
      query: function(params) {
        if (development) {
          console.log("query: called", params);
        }
        var t = template(params.template);
        var queryTemplate = Handlebars.compile(t, {noEscape: true});
        var query = queryTemplate(params.parameters);
        var method = params.method || "GET";

        if (development) {
          console.log("query: query built:\n" + query);
          console.log("query: sending to", params.endpoint);
        }

        var p = fetch(params.endpoint + '?query=' + query, {
          method: method,
          mode: 'cors',
          headers: {
            "Accept": "application/sparql-results+json"
          }
        }).then(res => res.json());

        if (development) {
          p.then(function(value, textStatus) {
            console.log("query:", textStatus, "data", value);
          });
        }

        return p;
      },
      render: function(params) {
        if (development) {
          console.log("render: called", params)
        }
        var t = template(params.template);
        var htmlTemplate = Handlebars.compile(t);
        var htmlFragment = htmlTemplate(params.parameters);
        if (development) {
          console.log("render: built:\n", htmlFragment)
        }
        var selector = params.selector || "main";

        element.shadowRoot.querySelector(selector).innerHTML = htmlFragment;

        if (development) {
          console.log("render: wrote to \"" + selector + "\"")
        }
      },
      root: element.shadowRoot,
      select: function(selector) {
        return this.root.querySelector(selector);
      },
      selectAll: function(selector) {
        return this.root.querySelectorAll(selector);
      },
      grouping: function(rows /* , ...keys */) {
        var _this = this;

        var normalizedKeys = Array.prototype.slice.call(arguments, 1).reduce(function(acc, key) {
          if (key instanceof Array) {
            return acc.concat({key: key, alias: key.join('_')});
          } else if (key instanceof Object) {
            return acc.concat(key);
          } else {
            return acc.concat({key: key, alias: key});
          }
        }, []);

        return (function(rows, keys) {
          function fetch(row, key) {
            if (key instanceof Array) {
              return key.map(function(k) {
                return row[k];
              });
            } else {
              return row[currentKey.key]
            }
          }

          var callee     = arguments.callee;
          var currentKey = keys[0];

          if (keys.length === 1) return rows.map(function(row) { return fetch(row, currentKey.key) });

          return _this.groupBy(rows, function(row) {
            return fetch(row, currentKey.key);
          }).map(function(group) {
            var currentValue = group[0];
            var remainValues = group[1];
            var remainKeys   = keys.slice(1);
            var nextKey      = remainKeys[0];
            var ret          = {};

            ret[currentKey.alias] = currentValue;
            ret[nextKey.alias]    = callee(remainValues, remainKeys)

            return ret;
          });
        })(rows, normalizedKeys);
      },
      groupBy: function(array, func) {
        var ret = [];

        array.forEach(function(item) {
          var key = func(item);

          var entry = ret.filter(function(e) {
            return e[0] === key;
          })[0];

          if (entry) {
            entry[1].push(item);
          } else {
            ret.push([key, [item]]);
          }
        });

        return ret;
      },
      unwrapValueFromBinding: function(queryResult) {
        var bindings = queryResult.results.bindings;

        return bindings.map(function(binding) {
          var ret = {};

          Object.keys(binding).forEach(function(key) {
            ret[key] = binding[key].value;
          });

          return ret;
        });
      }
    };
  }

  function update(element) {
    var params = {};
    descriptor.parameters.forEach(function(key) {
      params[key] = element.getAttribute(key);
    });
    execute(createStanzaHelper(element), params);
  }

  class StanzaElement extends HTMLElement {
    constructor() {
      super(); 
      var shadow = this.attachShadow({ mode: 'open' });
      var style = document.createElement("style");
      style.appendChild(document.createTextNode(descriptor.stylesheet));
      shadow.appendChild(style);
      var main = document.createElement("main");
      shadow.appendChild(main);

      update(this);
    }
    attributeChangedCallback(attrName, oldVal, newVal) {
      var found = false;
      descriptor.parameters.forEach(function(key) {
        if (attrName == key) {
          found = true;
        }
      });
      if (found) {
        update(this);
      }
    }
  }

  if ('customElements' in window && !window.customElements.get(descriptor.elementName)) {
     window.customElements.define(descriptor.elementName, StanzaElement);
  }
};
