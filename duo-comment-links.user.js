// ==UserScript==
// @name         Duolingo Comment Links
// @description  Turn comment timestamps into direct links
// @match        *://www.duolingo.com/*
// @author       HodofHod
// @namespace    HodofHod
// @version      0.0.3
// ==/UserScript==

/*
Copyright (c) 2013-2014 HodofHod (https://github.com/HodofHod)

Licensed under the MIT License (MIT)
Full text of the license is available at https://raw2.github.com/HodofHod/Userscripts/master/LICENSE
*/

function inject(f) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.setAttribute('name', 'comment_links');
    script.textContent = '(' + f.toString() + ')()';
    document.body.appendChild(script);
}

inject(function(){
    $(document).on('mouseover', '.discussion-comments-list:not(.dlinked)', function (){
        $(this).addClass('dlinked');    
        $('li[id*=comment-] .body').each(function(){
            var $timestamp = $(this).next('.footer').contents().filter(function(){return this.nodeType === 3;}),
                $link = $('<a href="' + document.location.pathname.replace(/\$.+$/, '') +
                            '$comment_id=' + this.id.replace(/^body-(\d+)$/, '$1') +
                            '">' + $timestamp.text() + '</a>');
            $timestamp.replaceWith($link);
        });
    });
});
