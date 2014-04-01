// ==UserScript==
// @name         Duolingo - Easy Accents
// @description  Makes typing characters with accents and diacritics easy! Just use the Alt key!
// @match        *://www.duolingo.com/*
// @author       @HodofHod
// @version      0.1.7
// ==/UserScript==

/*
Copyright (c) 2013-2014 HodofHod (https://github.com/HodofHod)

Licensed under the MIT License (MIT)
Full text of the license is available at https://raw2.github.com/HodofHod/Userscripts/master/LICENSE
*/

// Technically, these are accents, diacritics, and ligatures, 
// but accents is the commonest of those terms so that's the script's title.
// Some languages have characters that can be accented in many different ways 
// (like the French 'e' or the Portuguese 'a'). While those letters are reachable by tapping ALT multiple times, 
// it may become unweildy and annoying. I am open to other suggestions.

function inject(f) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.setAttribute('name', 'easy_accents');
    script.textContent = '(' + f.toString() + ')()';
    document.body.appendChild(script);
}

inject(main);
function main(){
    console.log('Duo Easy Accents');
    var maps = {
        es: {'A':'&aacute;', 'E':'&eacute;', 'I':'&iacute;', 'O':'&oacute;', 'U':'&uacute;&uuml;', 'N':'&ntilde;', '1':'&iexcl;', '!':'&iexcl;', '?':'&iquest;'},
        fr: {'A':'&agrave;&acirc;&aelig;', 'E':'&egrave;&eacute;&ecirc;&euml;', 'I':'&icirc;&iuml;', 'O':'&ocirc;&oelig;', 'U':'&ugrave;&ucirc;&uuml;', 'C':'&ccedil;'},
        pt: {'A':'&atilde;&aacute;&acirc;&agrave;', 'E':'&eacute;&ecirc;', 'I':'&iacute;', 'O':'&otilde;&oacute;&ocirc;', 'U':'&uacute;&uuml;', 'C':'&ccedil;'},
        de: {'A':'&auml;', 'O':'&ouml;', 'U':'&uuml;', 'S':'&szlig;'},
        it: {'A':'&agrave;&aacute;', 'E':'&egrave;&eacute;', 'I':'&igrave;&iacute;', 'O':'&ograve;&oacute;', 'U':'&ugrave;&uacute;'},
        pl: {'A':'&#261;', 'C':'&#263;', 'E':'&#281;', 'L':'&#322;', 'N':'&#324;', 'O':'&oacute;', 'S':'&#347;', 'Z':'&#378;&#380;'},
        ro: {'A':'&#259;&acirc;', 'I':'&icirc;', 'S':'&#351;&#537;', 'T':'&#355;&#539;'},
        hu: {'A':'&aacute;', 'E':'&eacute;', 'I':'&iacute;', 'O':'&ouml;&oacute;&#337;', 'U':'&uuml;&uacute;&#369;'},
        dn: {'E':'&eacute;&euml;', 'I':'&iuml;', 'O':'&oacute;&ouml;', 'U':'&uuml;'},
        tr: {'C':'&ccedil;', 'G':'&#287;', 'I':'&#305;&#304;', 'O':'&ouml;', 'S':'&#351;', 'U':'&uuml;'}
        },
        taps = 0,
        last_press = [];

    $(document).on('keydown', '[lang][lang!=en]', function (e) {
        //If the pressed key isn't already pressed, return
        if (!e.altKey || e.which===18) { return; }
        //If the same key is pressed in a short period of time, increment taps
        taps = (last_press[0] === e.which && new Date() - last_press[1] <= 750) ? taps+1 : 1;
        //Get accented chr; taps-1 is the 0-indexed accented chr to get.
        var chr = get_char(e.target.lang, String.fromCharCode(e.which), taps-1);
        if (!chr){ return false; }
        chr = e.shiftKey ? chr.toUpperCase() : chr;
        //Insert chr into textarea; Replace last chr for multiple taps by taps>1
        insert_char(this, chr, taps>1);
        last_press = [e.which, new Date()];
        //To override any other Alt+<x> hotkeys.
        return false;
    });
    
    function get_char(lang, base, index){
        if (!maps[lang]){ return false; }
        var char_lst = maps[lang][base];
        //Unicode errors, so:
        if (char_lst){
            char_lst = char_lst.split(';').slice(0,-1)
            character = htmlDecode(char_lst[index % char_lst.length] + ';');
        }
        return char_lst ? character : false;
    }
    
    function htmlDecode(input){
        var e = document.createElement('div');
        e.innerHTML = input;
        return e.childNodes[0].nodeValue;
    }
    
    function insert_char(textarea, new_char, del){
        var text = textarea.value,
            start = textarea.selectionStart,
            end = textarea.selectionEnd;
        //Insert the character. If we're rotating through alternate letters, remove the last character.
        textarea.value = text.slice(0, del ? end-1 : start) + new_char + text.slice(end);         
        //Move the caret. If deleting the previous, the caret should remain. (Hence x+!del)
        //If replacing selected text (and not deleting previous), caret should unselect and be start+1
        textarea.setSelectionRange(start+!del, (end-start&&!del ? start : end) +!del); 
    }
    $(document).on('keyup', '[lang][lang!=en]', function (e){
        if (e.which === 18){ //ALT keyup
            //Reset the last tapped key.
            last_press = [];
            //This ALT keyup isn't from an ALT+<x> combo, so modify the last char
            if (taps===0){
                var base = this.value.slice(this.selectionEnd-1, this.selectionEnd),
                    index;
                $.each(maps[e.target.lang], function(key, val){
                    index = val.indexOf(base.toLowerCase());
                    if (index > -1){
                        base = (base.toUpperCase() === base) ? key : key.toLowerCase();
                        return false;
                    }
                });
                var chr = get_char(e.target.lang, base.toUpperCase(), index+1);
                if (!chr){ return false; }
                chr = /[A-Z]/.test(base) ? chr.toUpperCase() : chr;
                insert_char(this, chr, true);
            }
            taps = 0;
            return false;
        }
    }); 
}
