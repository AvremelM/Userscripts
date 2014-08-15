// ==UserScript==
// @name       Duolingo Immersion Bookmarks
// @version    0.1
// @match      *://www.duolingo.com/*
// ==/UserScript==

var bookmark_icon = $('<a class="bookmark-line-icon" title="Bookmark this sentence">'+
    '<svg version="1.1" x="0px" y="0px" width="20px" height="20px" viewBox="0 0 512 512" enable-background="new 0 0 512 512" space="preserve" style="top: -1px; left: 0px; position: absolute;">'+
		'<polygon class="star-icon-outline" points="256,144 256,60 193,190 49,209 154,309 128,451 256,383 383,451 357,309 462,209 318,190 256,60"></polygon>'+
    	'<polygon class="star-icon-fill"    points="256,144 294,223 381,235 317,296 333,383 256,341 178,383 194,296 130,235 217,223"></polygon></svg></a>');

var jump_button = $('<a class="btn btn-standard btn-small" style="margin-right: 10px;top: 100%;position: absolute;" data-toggle="tooltip">'+
                    'Jump to bookmark'+
                    '<span data-original-title="Dismiss" data-toggle="tooltip" class="jump-dismiss icon icon-x-white-small"'+
                    'style="margin-left: 10px;"></span></a>');

var styles = '<style>'+
    '.bookmark-line-icon{'+
    	'background-color: color;'+
        'width:20px;'+
        'height:20px;'+
        'border-radius: 10px;'+
        'display: block;'+
        'left: -25px;'+
        'position: absolute;'+
    '}'+
    '.star-icon-outline{'+
    	'fill: grey;'+
    '}'+
    '.star-icon-fill{'+
		'fill: white;'+
    '}'+
    '.bookmark-line-icon:hover .star-icon-fill,'+
    '.bookmark-line-icon.active .star-icon-fill {'+
    	'fill: gold;'+
    '}'+
    '</style>';

(function init(){    
    var origClickSentence = duo.WikiTranslationView.prototype.clickSentence,
        origTranslationViewRender = duo.LoggedOutWikiTranslationView.prototype.renderVisibleSentences,
        doc_loaded = false;
    
    duo.WikiTranslationView.prototype.clickSentence = function(sentence_index){
        addIcon(sentence_index);
        return origClickSentence.apply(this, arguments);
    };
    duo.LoggedOutWikiTranslationView.prototype.renderVisibleSentences = function(){
        var result = origTranslationViewRender.apply(this, arguments);
        if (!doc_loaded) {
            doc_loaded =  true;
    		$('body').append(styles);
            var rememberedLine = (getRememberedLine());
            if (rememberedLine) {
                $('.document-header-new').append(jump_button);
                var icon = addIcon(rememberedLine).addClass('active');
                jump_button.on('click', function(){
                    $('body').animate({'scrollTop': $('.bookmark-line-icon.active').offset().top - 200});
                });
                $('.jump-dismiss').on('click',function(){
                    jump_button.fadeOut(function(){ $(this).remove() });
                });
            }
        }
        return result
    }
})();


function addIcon(sentence_index){
    var sentence = $('.sentence-wrapper[data-index=' + sentence_index + ']');
    if (sentence.find('.bookmark-line-icon').length === 0){
        var new_icon = bookmark_icon.clone(true),
            top = sentence.position().top;// + (parseInt(sentence.css('line-height'), 10) / 2) - (new_icon.height() / 2);
        sentence.before(new_icon);
        new_icon.css('top', top);
        $('.bookmark-line-icon:not(.active)').not(new_icon).remove();
        
        new_icon.on('click', function(){
            bookmark(new_icon, sentence_index);
        });
	}
    return new_icon;
}

function bookmark(icon, sentence_index){
    if (icon.hasClass('active')){
        icon.removeClass('active');
        forgetArticle();
    } else {
        var old_line_number = $('.bookmark-line-icon.active').parent().data('index');
        $('.bookmark-line-icon').not(icon).remove();
        icon.addClass('active');
        rememberLine(sentence_index);
    }
}

function getRememberedLine(){
    var article_id = document.location.pathname.match(/\/translation\/([\da-z]+)/);
    return localStorage.getItem('duo-immersion-bookmark-'+article_id);
}
function rememberLine(line_number){
    var article_id = document.location.pathname.match(/\/translation\/([\da-z]+)/);
    localStorage.setItem('duo-immersion-bookmark-' + article_id, line_number);
}

function forgetArticle(){
    var article_id = document.location.pathname.match(/\/translation\/([\da-z]+)/);
    localStorage.removeItem('duo-immersion-bookmark-'+article_id);
}
