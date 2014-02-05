// ==UserScript==
// @name         Duolingo Mods
// @description  Includes Lesson Review, Easy Accents, and other miscellaneous mods.
// @match        *://www.duolingo.com/*
// @author       HodofHod
// @namespace    HodofHod
// @version      0.1.1
// ==/UserScript==

function inject(f) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = '(' + f.toString() + ')()';
    script.setAttribute("name", "duo-mods");
    document.head.appendChild(script);
}

inject(main);

function main(){
    //modified from developer.mozilla.org/en-US/docs/Web/API/document.cookie
    function getCookie(sKey) {
        return unescape(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
    }
    function setCookie(sKey, sValue) {
        document.cookie = escape(sKey) + "=" + escape(sValue) + 
        "; expires=Fri, 31 Dec 9999 23:59:59 GMT; domain=duolingo.com; path=/";
    }
    function addScript(URL, name) {
        if (getCookie(name) === 'false' || $('script[name='+name+']').length){return false;}
        var script = document.createElement("script");
        script.setAttribute("src", URL);
        script.setAttribute("name", name);
        document.head.appendChild(script);
    }
    function b(){
        var base = '//github.com/HodofHod/Userscripts/raw/master/';
        addScript(base+'duo-easy-accents.user.js', 'easy_accents');
        addScript(base+'duolingo-lesson-review.user.js', 'lesson_review');
        addScript(base+'duo-comment-links.user.js', 'comment_links');
    }
    b();
    
    var mods = ['Lesson Review', 'Easy Accents', 'Comment Links'];
    $(document).on('mouseover', '#app.settings', function(){
        if (!$('#mod-settings').length){
            console.log('modded');
            template = $('.radio-buttons:last').parents('li').after('<hr>');
            $.each(mods, function(){
                var esc_name = this.toLowerCase().replace(/ /g, '_'),
                    innerHtml = template.clone().html().replace(/sound_effects/g, esc_name)
                                                 .replace('Sound effects', this),
                    $setting = $('<li>'+innerHtml+'</li>').insertAfter(template),
                    cookie = getCookie(esc_name),
                    which = (cookie === "true" || !cookie ? 'first' : 'last');
                $setting.find('input:radio:' + which).prop('checked', true);
                $setting.find('input:radio').on('change', function(e){
                    var on = /_on$/.test(e.target.id);
                    setCookie(esc_name, on), b();
                    !on && $('script[name='+esc_name+']').remove() && (duo.js_version='');
                });
            });
            template.after('<hr id="mod-settings">');
        }
    });
}
