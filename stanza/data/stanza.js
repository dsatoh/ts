function Stanza(execute) {
  var currentScript = document._currentScript || document.currentScript;
  var ownerDocument = currentScript.ownerDocument;
  var proto = Object.create(HTMLElement.prototype);

  function createStanzaHelper(element) {
    return {
      query: function(params) {
        var queryTemplate = Handlebars.compile(descriptor.templates[params.template], {noEscape: true});
        var query = queryTemplate(params.parameters);

        return $.ajax({
          url: params.endpoint,
          data: {
            format: "json",
            query: query
          }
        });
      },
      render: function(params) {
        var htmlTemplate = Handlebars.compile(descriptor.templates[params.template]);
        var htmlPartial = htmlTemplate(params.parameters);
        var selector = params.selector || "main";
        $(selector, element.shadowRoot).html(htmlPartial);
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

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();

    var style = document.createElement("style");
    style.appendChild(document.createTextNode(descriptor.stylesheet));
    shadow.appendChild(style);
    var main = document.createElement("main");
    shadow.appendChild(main);

    var toolbarTemplate = ownerDocument.querySelector("template#tool_bar");
    var clone = document.importNode(toolbarTemplate.content, true);
    shadow.appendChild(clone);

    update(this);
  };

  proto.attributeChangedCallback = function(attrName, oldVal, newVal) {
    update(this);
  };

  document.registerElement(descriptor.elementName, {
    prototype: proto
  });
};
