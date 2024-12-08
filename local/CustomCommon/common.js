"use strict";

window.cc = {
  i: (x, y) => {
    return y ? y.getElementById(x) : document.getElementById(x);
  },
  c: (x, y) => {
    return y ? y.getElementsByClassName(x) : document.getElementsByClassName(x);
  },
  t: (x, y) => {
    return y ? y.getElementsByTagName(x) : document.getElementsByTagName(x);
  },
  q: (x, y) => {
    return y ? y.querySelector(x) : document.querySelector(x);
  },
  l: (x, y, z) => {
    //x:true or false y:string z:variable to debug
    x === true ? (y === undefined ? console.log(z) : console.log(y + " : " + z)) : undefined;
  },
  nullish: (x) => {
    return x === null || x === undefined;
  },

  /**
   * Returns boolean whether elementName is null or undefined
   * @param {element} element element to investigate
   * @returns {boolean} returns true if desired element is null or undefined
   */
  isNullorUndefined: (element) => {
    return typeof element === "undefined" || typeof element === "null" ? false : true;
  },

  checkCache404: (url) => {
    return fetch(url)
      .then((response) => {
        if (response.ok === true) {
          return true;
        } else {
          return false;
        }
      })
      .catch((err) => {
        console.error(err);
      });
  },

  fetchWatchPage: async (SMID) => {
    SMID = SMID ? SMID : /s[mo][0-9]+/.exec(location.pathname)[0];
    return fetch("https://www.nicovideo.jp/watch/" + SMID)
      .then((response) => {
        if (response.ok === true) {
          return response.text();
        } else {
          console.error("HTTP status code : " + response.status);
          console.error("HTTP status Text : " + response.statusText);
          throw new Error(errorcode);
        }
      })
      .then((text) => new DOMParser().parseFromString(text, "text/html"))
      .then((document) => {
        const serverContext = JSON.parse(cc.q('meta[name="server-context"]', document).content);
        const serverResonse = JSON.parse(cc.q('meta[name="server-response"]', document).content);

        return {
          serverContext: serverContext,
          serverResonse: serverResonse
        };
      })
      .catch((error) => {
        console.error(error);
      });
  },

  MainVideoPlayerWidthHeightReturner: (option) => {
    const main = document.getElementsByTagName("video")[0].getBoundingClientRect();
    const tb = (x, y) => {
      if (y === "top") return x.top + window.scrollY;
      if (y === "bottom") return x.bottom + window.scrollY;
      if (y === "left") return x.left + window.scrollX;
      if (y === "right") return x.right + window.scrollX;
    };
     if (option === "MainContainerY") {
      return tb(main, "top");
    } else if (option === "MainContainerBottom") {
      return tb(main, "bottom");
    } else if (option === "MainContainerX") {
      return tb(main, "left");
    } else if (option === "MainContainerRight") {
      return tb(main, "right");
    } else if (option === "MainContainerWidth") {
      return main.width;
    } else if (option === "MainContainerHeight") {
      return main.height;
    } else {
      console.error("MainVideoPlayerWidthHeightReturner: No Such Option");
    }
  },

  Toast: (
    option = {
      mode: mode, //String "Success","Info","Warning","Error"
      middle: middle, //String
      low: low, //String
      title: title, //String
      timeout: timeout, //Number
    }
  ) => {
    // トースト表示する
    // Requires jquery.min.js toastr.min.js toastr.min.css
    const style = "overflow-wrap:break-word;";
    toastr.options = {
      closeButton: true,
      debug: false,
      newestOnTop: false,
      progressBar: true,
      positionClass: "toast-bottom-right",
      preventDuplicates: false,
      onclick: null,
      showDuration: "300",
      hideDuration: "1000",
      timeOut: option.timeout,
      extendedTimeOut: "1000",
      showEasing: "swing",
      hideEasing: "linear",
      showMethod: "fadeIn",
      hideMethod: "fadeOut",
    };
    toastr[option.mode](`<span style="${style}"> <p>${option?.middle}</p><p>${option?.low}</p></span>`, `<p style="${style}">${option.title}</p>`);
  },
};
