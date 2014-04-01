// ==UserScript==
// @name         Duolingo Mods
// @description  Includes Lesson Review, Easy Accents, and other miscellaneous mods.
// @match        *://www.duolingo.com/*
// @author       HodofHod
// @namespace    HodofHod
// @version      0.3.1
// ==/UserScript==

/*
Copyright (c) 2013-2014 HodofHod (https://github.com/HodofHod)

Licensed under the MIT License (MIT)
Full text of the license is available at https://raw2.github.com/HodofHod/Userscripts/master/LICENSE
*/

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
    var scripts = {
            'Lesson Review' : {id: 'lesson_review', url: 'duolingo-lesson-review', 
                desc: 'Adds the ability to go back and review missed problems'}, 
            'Easy Accents': {id: 'easy_accents', url: 'duo-easy-accents',
                desc: 'Type accented characters easily in lessons, using the Alt key'}
        },mods = {
            'Discussion Search': {id: 'discussion_search', func: discussionSearch,
                desc: 'Expandable search box on the discussions page'}, 
            'Notification Links': {id: 'notification_links', func: notificationLinks, 
                desc: 'Clicking on a notification will take you to its event page'},
            'Open in New Tab': {id: 'ctrl_new_tab', func: ctrlNewTab, 
                desc: 'Holding ctrl when clicking a link opens a new tab. Like it\'s supposed to'}, 
            'Comment Links': {id: 'comment_links', func: commentLinks,
                desc: 'Turns the timestamps underneath comments into direct links to themselves'}
        };
    
    function addMods(){
        function addScript(URL, name) {
            var script = document.createElement("script");
            script.setAttribute("src", URL);
            script.setAttribute("name", name);
            document.head.appendChild(script);
        }
        
        var base = ['//rawgithub.com/HodofHod/Userscripts/master/', '.user.js'];
        $.each(scripts, function(title, val){
            var esc_name = val.id;
            if (getCookie(esc_name) !== 'false' && !$('script[name='+esc_name+']')[0]){
                addScript(base.join(val.url), esc_name);
            }
        });
        
        $.each(mods, function(title, val){
            var esc_name = val.id;
            if (getCookie(esc_name) !== 'false'){
                $('*').off('.' + esc_name);
                val.func(val.id);
            }
        });
    }
    addMods();
    
    
    $(document).on('mouseover', '#app.settings', function(){
        if (!$('#mod-settings').length){
            console.log('modded');
            $('.radio-buttons:last').parents('li').after('<hr><li id="mod-settings" style="margin:-25px 0 20px 0;"/><hr>');
            var template = $('<li style="float:left; margin-top:20px;">\
                                <label class="label"></label>\
                                <input class="border" type="checkbox" style="float:left; margin:4px 20px 0 30px;">\
                              </li>');
            $.each($.extend({}, scripts, mods), function(title, val){
                var esc_name = val.id;//[0],
                    $setting = template.clone().find('label').text(title).attr('title', val.desc)//[2])
                                       .end().find('input').attr('id', esc_name).end();//this line is really unnecessary.
                    cookie = getCookie(esc_name),
                    enabled = (cookie === "true" || !cookie);
                $('#mod-settings').append($setting);
                $setting.find('input').prop('checked', enabled);
                $setting.find('input').on('change', function(e){
                    var checked = $(this).prop('checked');
                    setCookie(esc_name, checked), addMods();
                    if (!checked){
                        $('script[name='+esc_name+']').remove();
                        $('*').off('.' + esc_name);
                        duo.js_version = '';//forces a page reload when navigating away.
                    }
                });
            });
        }
    });
    
    function discussionSearch(nspace){
        $(document).on('input.'+nspace, 'input[name=search]', function () {
            var $textarea = $(this),
            $searchtools = $('.comment-rankings>.search-topics, #ask-question');
            if (!this.expanded && this.value.length >= 8){
                $(this).prop('expanded', true);
                $('.nav-tabs').css({'clear': 'both','padding-top': '50px'});
                $('.comment-rankings>h1').css({'position': 'absolute'});
                $searchtools.animate({
                    'margin-bottom': '-30px',
                    'margin-top': '50px'
                    }, 250, function () {
                    //The textarea has a transition css property already
                    //So it'll animate on its own.
                    $textarea.css('width', '415px');
                });
            } else if (this.expanded && this.value.length < 8) {
                $(this).css({'width': ''});
                $searchtools.delay(250).animate({
                    'margin-top': '0px',
                    'margin-bottom': ''
                }, 300);
                $(this).prop('expanded', false);
            }
        });
    }
    function notificationLinks(nspace){
        $(document).on('mouseover.'+nspace, '#popover-notifications:not(.event-linked)', function(){
            $(this).addClass('event-linked');
            var link = $('<a class="event_link">').css({
                position: 'absolute', 'z-index': '1',
                width: '100%', height: '100%',
                top: 0, left: 0
            }),
                ids = $.map(duo.user.get('notification_events'), function(el){
                    return el.id;
            });
            
            $('.list-notifications>li').css('position', 'relative').each(function(i){
                $(this).find('a').css({'z-index': '9', 'position': 'relative'}).end()
                .prepend(link.clone().attr('href', '/event/'+ids[i]));
            });
            
            $('.event_link').hover(function () {
                $(this).css('background-color', 'rgba(0, 0, 0, 0.009)');
                }, function () {
                $(this).css('background-color', '');
            });
        });
    }
    
    function ctrlNewTab(nspace){
        $('body').on('click.' + nspace, 'a:not([data-bypass])', function (e){
            if (e.ctrlKey){
                e.stopImmediatePropagation();
                $(this).attr('target', '_blank').one('mouseout', function(){
                    $(this).removeAttr('target');
                });
            }
        });
    }
    
    function commentLinks(nspace){
        commentTimes();
        $(document).on('mouseover', '.discussion-comments-list:not(.dlinked)', function (){
            $(this).addClass('dlinked');
            base_url = document.location.pathname.replace(/\$.+$/, '');
            $('li[id*=comment-] .body').each(function(){
                var $timestamp = $(this).next('.footer').contents().filter(function(){
                        return this.nodeType === 3;
                    }),
                    direct = '$comment_id=' + this.id.replace(/^body-(\d+)$/, '$1'),
                    $link = $('<a class="direct-comment-link">')
                        .attr('href', base_url+direct)
                        .text($timestamp.text());
                $timestamp.replaceWith($link);
            });
        });
    }
    
    function commentTimes(){
        var comViewRender  = duo.CommentView.prototype.render,
            listViewRender = duo.CommentListView.prototype.render,
            CV, LV;
        
        duo.CommentView.prototype.render = function(){
            CV = this.model;
            return comViewRender.apply(this, arguments);
        };
        
        duo.CommentListView.prototype.render = function(){
            LV = this;
            return listViewRender.apply(this, arguments);
        };
        
        $(document).on('mouseover', '.list-discussion-item-footer:not(.timeadded), .discussion-main-detail:not(.timeadded)', function(){
            $(this).addClass('timeadded');
            //id is only for list items and comment threads, not top comment posts.
            var id = this.parentNode.id.replace('comment-',''),
                post = (!$(this).is('footer') ? CV
                        : $(LV.collection.models).filter(function(){ return this.id==id; })[0]),
                $timestamp = $(this).contents().filter(function(){return this.nodeType==3;}).eq(0);
            $timestamp.replaceWith(
                $('<a>').attr('title', gettime(post))
                        .text($timestamp.text())
            );
        });
        
        $(document).on('mouseover', '.discussion-comments-list.dlinked:not(.timeadded)', function(){
            $(this).addClass('timeadded');
            var comments = CV.get('comments').models;
            $.each(comments, function(){
                $('[id$=comment-'+this.id + ']').find('.direct-comment-link')
                    .attr('title', gettime(this));
            });
        });
        
        function gettime(a){return a.get('datetime_string').replace(/T([\d:]+)Z/,' at $1 GMT')}
        
    }
}
