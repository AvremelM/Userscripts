// ==UserScript==
// @name         Duolingo All Scripts
// @description  Loads duolingo userscripts dynamically, allowing for auto-updating and more.
// @match        *://www.duolingo.com/*
// @author       HodofHod
// @namespace    HodofHod
// @version      0.1.0
// ==/UserScript==

//So what this script will do is load Duolingo Mods, which has some miscellaneous mods, but will additionally,
//  load all the other scripts. This is so that you *never* have to update another one of my scripts, because I will
//  be modifiying DUoling Mods to only load the newest versions.
//Full disclosure, this kind of thing could be abused, in theory, if I were to modify the Duolingo Mods script 
//  to load malicious code as well; I wouldn't even have to update this script.
//  That's *never* going to happen, and the only things I will be loading are my own open-source scripts from GitHub,
//  But you should be aware that not always is this type of thing a good idea.

function addScript(URL, name) {
      var script = document.createElement("script");
      script.setAttribute("src", URL);
      script.setAttribute("name", name);
      document.head.appendChild(script);
}

addScript('//rawgithub.com/HodofHod/Userscripts/master/duo-mods.user.js', 'duo-mods');
