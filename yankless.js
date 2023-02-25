class Yankless {
  constructor(options = {}) {
    this.options = options;
    this.debug = options.debug || window.location.search.indexOf("debug") > -1;
    this.from = options.from || "US";
    this.debugColor = options.debugColor || "red";
    this.dialects = options.dialects || ["GB", "AU", "NZ", "ZA", "IE"];
    this.disable = true;
    this.add = options.add || {};
    this.ignore = options.ignore || [];
    this.loadDictionary();
  }

  loadDictionary() {
    // Get the language from the browser
    var language = navigator.language.split("-");
    // If the language is not English and the browser is not in the dialects list, don't load the dictionary
    if (!(language[0] == "en" && this.dialects.includes(language[1]))) return;
    // Load the dictionary
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "/assets/js/translations.js";
    script.defer = true;
    document.head.appendChild(script);
    script.onload = () => {
      // If we've set the from option to a dialect, swap the keys and values so we're translating to American
      if (this.dialects.includes(this.from)) {
        var r = Object.fromEntries(
          Object.entries(translations).map(([key, value]) => [value, key])
        );
        translations = r;
      }
      // Add any additional words and remove any ignored words
      if (this.add) {
        translations = { ...translations, ...this.add };
      }
      if (this.ignore) {
        this.ignore.forEach((word) => delete translations[word]);
      }
      this.disable = false;
    };
  }

  replaceWordforNode(c) {
    var debug = this.debug;
    var debugColor = this.debugColor;
    var t = translations;
    var r = new RegExp(`\\b(${Object.keys(t).join("|")})\\b`, "gi");
    if (c.nodeValue.match(r)) {
      var newString = c.nodeValue.replace(r, function (m) {
        var word = t[m];
        if (m != m.toLowerCase()) {
          m = m.toLowerCase();
          word = t[m].charAt(0).toUpperCase() + t[m].slice(1);
        }
        return debug
          ? `<span style='color:${debugColor}'>${word}</span>`
          : word;
      });
      const template = document.createElement("template");
      template.innerHTML = newString;
      c.parentNode.replaceChild(template.content, c);
    }
  }

  // Define the filter function
  textFilter(node) {
    // Ignore text nodes that are within script tags
    return node.parentNode.nodeName === "SCRIPT"
      ? NodeFilter.FILTER_REJECT
      : NodeFilter.FILTER_ACCEPT;
  }

  async translate() {
    // Wait for the dictionary to load
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (!this.disable) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });

    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      { acceptNode: this.textFilter },
      null,
      false
    );

    var node;
    var nodes = [];

    // Get all the text nodes and put them in an array
    while ((node = walker.nextNode())) {
      nodes.push(node);
    }

    // Process each text node and highlight if necessary
    nodes.forEach((n) => {
      this.replaceWordforNode(n);
    });
  }
}
