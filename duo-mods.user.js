// ==UserScript==
// @name         Duolingo Mods
// @description  Includes Lesson Review, Easy Accents, and other miscellaneous mods.
// @match        *://www.duolingo.com/*
// @author       HodofHod
// @namespace    HodofHod
// @version      0.0.1
// ==/UserScript==


function addScript(URL) {
  var script = document.createElement("script");
  script.setAttribute("src", URL);
  document.body.appendChild(script);
}

if (document.location.host === 'www.duolingo.com'){
    var base = '//github.com/HodofHod/Userscripts/raw/master/';
    addScript(base+'duo-easy-accents.user.js');
    addScript(base+'duolingo-lesson-review.user.js');
    addScript(base+'duo-comment-links.user.js');
}
