// ==UserScript==
// @name         Duolingo - Lesson Review
// @description  This script allows you to go back and review all the different challenges in a lesson.
// @match        *://www.duolingo.com/*
// @author       HodofHod
// @namespace    HodofHod
// @version      0.2.1
// ==/UserScript==

/*
Copyright (c) 2013-2014 HodofHod (https://github.com/HodofHod)

Licensed under the MIT License (MIT)
Full text of the license is available at https://raw2.github.com/HodofHod/Userscripts/master/LICENSE
*/

//TODO: Inject a stylesheet and use classes instead of .css()?

function inject(f) { //Inject the script into the document
    var script;
    script = document.createElement('script');
    script.type = 'text/javascript';
    script.setAttribute('name', 'lesson_review');
    script.textContent = '(' + f.toString() + ')(jQuery)';
    document.head.appendChild(script);
}
inject(init);

function init(){
    console.log('Duolingo Lesson Review');
    var OrigSessionView  = $.extend({}, duo.SessionView.prototype),
        origTimesUp      = duo.TimedSessionView.prototype.timesUp,
        origPushState    = window.history.pushState;

    if (/^\/practice|skill|word_practice\/.*/.test(window.location.pathname)){ //for the first time the script is loaded, check if we're already on a page.
        main();
    }
    window.history.pushState = function checkPage(a, b, c){  //Hijack the window's pushState so we know whenever duolingo navigates to a new page.
        /^\/practice|skill|word_practice\/.*/.test(c) ? main() : cleanup();
        return origPushState.call(this, a, b, c);
    };

    function cleanup(){
        $(document).off('.hh'); //unbind any handlers from previous lessons.
        $.extend(duo.SessionView.prototype, OrigSessionView);
        duo.TimedSessionView.prototype.timesUp = origTimesUp;
    }

    function main(){
        cleanup();
        
        var lessons = {},
            current_id = 1,
            selected_id = current_id,
            finished = false,
            failed = false,
            header, last_lesson_id,
            redesign = duo.user.get("ab_options").site_redesign_experiment;
            
        function save_lesson(save_id){
            var $problem = $('.player-main'),
                $controls = $('.player-container>footer'),
                $discussion = $('#discussion-modal-container');
            
            lessons[save_id] = $.extend(lessons[save_id] || {}, {
                                0: $problem.add($controls), 
                                1: $discussion, 
                                2: $('#app').prop('class') });
            if (save_id !== 'end'){
                lessons[save_id][0] = $problem.after($problem.clone()).add($controls.clone(true)).detach();
                var l = lessons[save_id][0].add(lessons[save_id][1]),
                    resume_button = $('<button id="resume_button" class="btn success btn-lg right" tabindex="20">Resume</button>');
            
                //Disable or hide all controls except for discuss and report
                l.find('#submit_button, #skip_button, #home-button, #fix_mistakes_button').hide();
                l.find('#next_button, #continue_button, #retry-button')
                    .after($( $('#resume_button')[0] || resume_button) ).hide();
            }else{
                console.log('else '+ save_id);
            }
        }
        
        function replace_lesson(replace_id){
            console.log('cur: ' + current_id + ', old id: ' + selected_id + ', new id ' + replace_id);
            if (selected_id === replace_id){ return false; } //don't replace yourself with yourself.
            if (selected_id === current_id){//if switching away from cur_lesson or end
                lessons[current_id] = $.extend(lessons[current_id] || {}, 
                                        {0: $('.player-main, #end-carousel').hide()
                                            //detach footer to prevent #discussion-toggle conflicts
                                            .add($('.player-container>footer').detach()),
                                         1: $('#discussion-modal-container').detach(), 
                                         2: $('#app').prop('class')});
            }else{
                $('.player-container>footer, .player-main, #discussion-modal-container').detach();
            }
            
            var lesson = lessons[replace_id];
            $('.player-container').append(lesson[0].show());
            $('body').append(lesson[1]);//discussions
            $('#app').prop('class', lesson[2]);
            $('.hint-table, .twipsy, #controls .tooltip').hide();    
            
            if (finished && !failed){//Add or remove header as necessary, since success endview removes it.
                (replace_id !== current_id) ? $('.player-container').prepend(header)
                                            : $('.player-header').detach();
            }
            if (!$("#discussion-modal").length && current_id !== replace_id && 
                !(failed && replace_id === last_lesson_id)) {
                $('#discussion-toggle').off().one('click', function(e){
                    e.stopImmediatePropagation();
                    loadDiscussion(replace_id);//TODO: pass lessons[replace_id] instead?
                    $('#discussion-toggle, .close-modal-background').off().on('click', function(e){
                        e.stopImmediatePropagation();
                        $('#discussion-modal').modal('toggle');
                    });
                });
            }
            selected_id = replace_id;
            select_cell(selected_id);
        }
        
        function loadDiscussion(lesson_id){
            var sentence = new duo.Sentence({ id : lessons[lesson_id].key }),
                container = $( $('#discussion-modal-container')[0] || '<div id="discussion-modal-container"></div>' );
                learning_language = duo.user.get('learning_language'),
                ui_language = duo.user.get('ui_language');
            sentence.fetch({
                data: {
                    ui_language : ui_language || undefined,
                    learning_language : learning_language
                },success: function (){
                    lessons[lesson_id][1] = container.appendTo(document.body);
                    var comments = new duo.CommentModalView({
                        el : container,
                        correct : lessons[lesson_id].correct,
                        model : sentence,
                        ui_language : ui_language,
                        learning_language : learning_language
                    });
                    comments.render();
                }
            });
        }
        
        function select_cell(cell_num){
            //TODO: For redesign: add the box-shadow to .inner only. 
            //       Inherit b-color on .nothing, and reset on .done (red uses b-image, so it won't reset that);
            $('li[id^=element-]').find('.inner').andSelf().css({'box-shadow': '', 'border-right-width': '1px'});
            $('li#element-'+cell_num).find('.inner')
                                     .andSelf().css({'box-shadow': '1px 1px 3px 1px black inset',
                                                     'border-right-width': '0px'});
            $('li[id^=element-]:first-child').css({'-webkit-border-radius': '9px 0 0 9px', 
                                                  'border-radius': '9px 0 0 9px'});              
            $('li[id^=element-]:last-child').css({'-webkit-border-radius': '0 9px 9px 0', 
                                                  'border-radius': '0 9px 9px 0'});            
            activate_arrows();
        }

        //Hijack the rendered() function (it runs after each problem is rendered)
        duo.SessionView.prototype.rendered = function newRendered(){
            if ($('#prev-arrow, #next-arrow').length !== 2){
                add_arrows();
            }
            select_cell(selected_id);
            return OrigSessionView.rendered.apply(this, arguments);
        };

        //Hijack the function that switches lessons.
        duo.SessionView.prototype.next = function newNext(){
            $('#discussion-modal-container').detach();
            $('#pause_toggle').remove();
            current_id = (this.model.get('position') + 1); //adjust from 0-indexed
            save_lesson(current_id);
            current_id += 1;
            selected_id = current_id;
            return OrigSessionView.next.apply(this, arguments);
        };
        
        duo.SessionView.prototype.graded = function(){
            if (this.timer_view !== undefined){
                //add pause Button
                var timer = this.timer_view;
                $('#next_button').before('<button id="pause_toggle" class="btn btn-blue btn-lg" style="margin-right:10px;">Pause</button>');
                $('#pause_toggle').on('click', function(){
                    if (timer.paused === null){
                        timer.pause();
                        $('#next_button').attr('disabled','disabled');
                        $(this).text('Resume');
                    }else{
                        timer.resume();
                        $('#next_button').removeAttr('disabled');
                        $(this).text('Pause');
                    }
                });
            }
            var solution = this.model.getSubmittedSolution();
            OrigSessionView.graded.apply(this, arguments);
            if (solution.get('incorrect') && !solution.get('try-again')){
                $('li#element-' + current_id + '>.inner').andSelf()
                    .css('background-image', '-webkit-linear-gradient(top, #EE6969, #FF0000)')
                    .css('background-image', '-moz-linear-gradient(center top , #EE6969, #FF0000)');
            }
            lessons[current_id] = $.extend(lessons[current_id] || {}, {
                key: this.model.currentElement().get("solution_key"),
                correct: this.model.getSubmittedSolution().get("correct")
            });
        };
        
        function finish(){
            var button = $('<button id="review_button" class="btn large btn-lg btn-standard right" style="margin:0 10px 0 0;">Review</button>'),
                loc = failed ? '#controls>.col-right' : '.session-end-footer';
            $(loc).prepend(button);
            button.css(!failed ? {position:'absolute', left:'40px'}
                               : {float: 'left'});                    
            finished = true;
            last_lesson_id = current_id;
            current_id = 'end';
            selected_id = 'end';
            select_cell();//none
        }
        
        duo.TimedSessionView.prototype.timesUp = function(){
            save_lesson(current_id);
            finished = true;
            origTimesUp.apply(this, arguments);
        };
        
        duo.SessionView.prototype.showFailView = function(){
            failed = true;
            save_lesson(current_id);
            var r = OrigSessionView.showFailView.apply(this, arguments);
            finish();
            $('.close-fail').hide();
            add_arrows();
            return r;
        };
        
        duo.SessionView.prototype.showEndView = function(){
            //Timed out lessons don't need this. Timeouts will set finished to true earlier.
            //newNext() increments on the last one too, adjust for that, (except for timesUp)
            current_id -= !finished; 
            header = $('.player-header').detach();
            OrigSessionView.showEndView.apply(this, arguments);
            //end view won't have loaded. Wait for mousemove on end app, where the footer exists.
            $(document).on('mousemove', '#app.slide-session-end', function(){
                if ($('.session-end-footer').length){ 
                    finish(); 
                    $(document).off('mousemove', '#app.slide-session-end');
                }
            });
        };
        
        $(document).on('click.hh', 'li[id^=element-]', function(){
            var clicked_id = parseInt(this.id.replace('element-', ''), 10);
            if (lessons[clicked_id] !== undefined){
                replace_lesson(clicked_id);
            }
        });
        
        $(document).on('click.hh', '#resume_button', function(){ 
            replace_lesson(current_id); 
            if (finished && ($('#end-carousel .left').length > 1 || !$('#end-carousel .active').length)){
                $('#end-carousel .item').removeClass('active next left');
                $('#end-carousel .item:eq(' + $('.carousel-dots .active').data('slide') + ')').addClass('active');
                $('#end-carousel .item.active').is(':last-child') && $(".carousel").carousel("pause");
            }
        });    
        
        $(document).on('click.hh', '#review_button', function(){
            $(".carousel").carousel("pause");
            replace_lesson(last_lesson_id);
        });
        
        $(document).on('click.hh', '#prev-arrow, #next-arrow', function(){
            var lesson_id = (this.id === 'prev-arrow') ? selected_id-1 : selected_id+1;
            if (selected_id === 'end'){
                $('#review_button').click();
            }else if (!lessons[lesson_id] && current_id === 'end'){
                replace_lesson('end');
            }else{
                replace_lesson(lesson_id);
            }
        });
        
        function add_arrows(){
            $('#prev-arrow, #next-arrow').remove();
            var arrow = $('<span></span>').css({
                background: 'url("//d7mj4aqfscim2.cloudfront.net/images/sprite_mv_082bd900117422dec137f596afcc1708.png") no-repeat',
                width: '24px', height: '18px', float: 'left', 'pointer-events':'none', 'background-position': '-323px -130px'
            });
            
            $.each(['prev', 'next'], function(i, val){
                var rotate = 'rotate('+(val==='prev'?'-':'')+'90deg)';
                arrow.clone().attr('id', val +'-arrow').css({
                    margin: '31px 0 0' + (val==='prev' ?' -15px': ''),
                    transform: rotate, '-webkit-transform': rotate
                })[(val==='prev' ? 'prepend' : 'append') + 'To']('#progress-bar');
            });
            
            activate_arrows();
        }
        
        function activate_arrows(){
            var active   = {'background-position': '-323px -178px', cursor: 'pointer', 'pointer-events': ''},
                inactive = {'background-position': '-323px -130px', cursor: 'initial', 'pointer-events': 'none'};
            $('#prev-arrow').css( (selected_id > 1 || selected_id === 'end') ? active : inactive);
            $('#next-arrow').css( (selected_id !== current_id)               ? active : inactive);
        }
    }
}
