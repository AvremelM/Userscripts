// ==UserScript==
// @name         Duolingo - Lesson Review
// @description  This script allows you to go back and review all the different challenges in a lesson.
// @match        *://www.duolingo.com/*
// @author       HodofHod
// @namespace    HodofHod
// @version      0.1.6
// ==/UserScript==

//TODO: Inject a stylesheet and use classes instead of .css()?
//      Don't disable report when going to last lesson from failview.

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
    var origNext         = duo.SessionView.prototype.next,
        origRendered     = duo.SessionView.prototype.rendered,
        origGraded       = duo.SessionView.prototype.graded,
        origShowFailView = duo.SessionView.prototype.showFailView,
        origShowEndView  = duo.SessionView.prototype.showEndView,
        origTimesUp      = duo.TimedSessionView.prototype.timesUp,
        origPushState    = window.history.pushState;

    if (/^\/practice|skill|word_practice\/.+/.test(window.location.pathname)){ //for the first time the script is loaded, check if we're already on a page.
        main();
    }
    window.history.pushState = function checkPage(a, b, c){  //Hijack the window's pushState so we know whenever duolingo navigates to a new page.
        /^\/practice|skill|word_practice\/.+/.test(c) ? main() : cleanup();
        return origPushState.call(this, a, b, c);
    };

    function cleanup(){
        $(document).off('.hh'); //unbind any handlers from previous lessons.
        $.extend(duo.SessionView.prototype, {
            next: origNext, 
            rendered: origRendered, 
            graded: origGraded, 
            showFailView: origShowFailView, 
            showEndView: origShowEndView
        });
        duo.TimedSessionView.prototype.timesUp = origTimesUp;
    }

    function main(){
        cleanup();
        
        lessons = {};
        var cur_lesson_id = 1,
            selected_lesson_id = cur_lesson_id,
            finished = false,
            failed = false,
            header, last_lesson_id,
            waiting_for_discussion_load = false,
            redesign = duo.user.get("ab_options").site_redesign_experiment ;
        
        function save_lesson(save_id){
            var $problem = $('.player-main'),
                $controls = $('.player-container>footer'),
                $discussion = $('#discussion-modal-container');
            
            lessons[save_id] = redesign ? [$problem.add($controls), $discussion, $('#app').prop('class')]
                                        : [$('#app>div:not(.player-header)').clone(), $('#app').prop('class')];
            if (redesign && save_id !== 'end'){
                lessons[save_id][0] = $problem.after($problem.clone()).add($controls.clone()).detach();
                lessons[save_id][1] = !failed ? $discussion.detach() : $discussion;
                var l = lessons[save_id][0].add(lessons[save_id][1]),
                    resume_button = $('<button id="resume_button" class="btn success large right" tabindex="20">Resume</button>');
            
                //Disable or hide all controls except for discuss
                l.find('#show-report-options').attr('disabled', 'disabled');
                l.find('#submit_button, #skip_button, #home-button, #fix_mistakes_button').hide();
                l.find('#next_button, #continue_button, #retry-button')
                    .after($('#resume_button').length ? null : resume_button).hide();
            }
        }
        
        function replace_lesson(replace_id){
            console.log('cur: ' + cur_lesson_id + ', old id: ' + selected_lesson_id + ', new id ' + replace_id);
            if (selected_lesson_id === replace_id){ return false; } //don't replace yourself with yourself.
            if (selected_lesson_id === cur_lesson_id || selected_lesson_id === 'end'){//if switching away from cur_lesson
                lessons[cur_lesson_id] = redesign ? [$('.player-main, #end-carousel').hide()
                                                        //detach footer to prevent #discussion-toggle conflicts
                                                        .add($('.player-container>footer').detach()),
                                                     $('#discussion-modal-container').detach(), 
                                                     $('#app').prop('class')]
                                                  : [$('#app>div:not(.player-header)').hide(), 
                                                     $('#app').prop('class')];
            }else if (lessons[replace_id] === undefined){
                return false;
            }else{
                redesign ? $('.player-container>footer, .player-main, #discussion-modal-container').detach()
                         : $('#app>div:not(.player-header)').remove();
            }
            
            var l = lessons[replace_id][0];
            $(redesign?'.player-container':'#app').append(l.show());
            redesign && $('body').append(lessons[replace_id][1]);//discussions
            $('#app').prop('class', lessons[replace_id][redesign+1]);//tricky trick
                
            $('.hint-table, .twipsy, #controls .tooltip').hide();    
            if (finished && !failed){//Add or remove header as necessary, since success endview removes it.
                (replace_id !== cur_lesson_id) ? $(redesign?'.player-container':'#app').prepend(header)
                                               : $('.player-header').detach();
            }
            
            bind_discussion_toggle();//TODO: Remove the other?
            selected_lesson_id = replace_id;
            select_cell(selected_lesson_id);
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
            select_cell(selected_lesson_id);
            preloadDiscussions();
            return origRendered.apply(this, arguments);
        };

        //Hijack the function that switches lessons.
        duo.SessionView.prototype.next = function newNext(){
            if ($('#discussion-toggle').size() && !$("#discussion-modal").size()){
                waiting_for_discussion_load = true;
            } else {
                cur_lesson_id = (this.model.get('position') + 1); //0-indexed
                save_lesson(cur_lesson_id);
                cur_lesson_id += 1;
                selected_lesson_id = cur_lesson_id;
                return origNext.apply(this, arguments);
            }
        };
        
        duo.SessionView.prototype.graded = function(){
            var solution = this.model.getSubmittedSolution();
            origGraded.apply(this, arguments);
            if (solution.get('incorrect') && !solution.get('try-again')){
                $('li#element-' + cur_lesson_id + '>.inner').andSelf()
                    .css('background-image', '-webkit-linear-gradient(top, #EE6969, #FF0000)')
                    .css('background-image', '-moz-linear-gradient(center top , #EE6969, #FF0000)')
                    .css(redesign ? {} : {'border': '1px solid #950000', 'border-left':'none'});
            }
        };
        function bind_discussion_toggle(){
            $('#discussion-toggle').off().on('click', function(e){
                e.stopImmediatePropagation();
                $('#discussion-modal-container').show();
                $('#discussion-modal').modal('show');
                $('.close-modal-background, .modal-backdrop, .player-discussion>.close').on('click', function(){
                    $('#discussion-modal').modal('hide');
                });
            });
        }
        
        //Load the discussions so they're saved by the cloning.
        function preloadDiscussions(){
            document.body.addEventListener('DOMNodeInserted', function waitForToggle(e) {
                if (redesign ? $(e.target).has('#discussion-toggle').length && e.target.id !== 'controls'
                               : e.target.id === 'discussion-modal-container'){
                    $('<style type="text/css" id="modalcss">.modal-backdrop{display:none;}</style>').appendTo("head");
                    $('#discussion-modal-container').hide();
                    $('#discussion-toggle').click();
                    bind_discussion_toggle();
                    document.body.removeEventListener('DOMNodeInserted', waitForToggle);
                }
            });
            document.body.addEventListener('DOMNodeInserted', function waitForDiscussions() {
                if  ($('.modal-backdrop.in').length){
                    $('#discussion-modal').modal('toggle');
                    $('.modal-backdrop.in, #modalcss').remove();
                    if (waiting_for_discussion_load === true){
                        waiting_for_discussion_load = false;
                        $('#next_button, #continue_button').click();
                    }
                    document.body.removeEventListener('DOMNodeInserted', waitForDiscussions);
                }
            });
        }
        
        function finish(){
            var button = $('<button id="review_button" class="btn large btn-lg btn-standard right" style="margin:0 10px 0 0;">Review</button>'),
                loc = failed ? '#controls>' + (redesign ? '.col-right' : '.row>.right') 
                             : (redesign ? '.session-end-footer' : 'div.buttons');
            failed ? $(loc).append(button) : $(loc).prepend(button);//Redesign CAN both be prepend
            button.css(!failed && redesign ? {position:'absolute', left:'40px'}
                                           : {float: 'left'});                    
            finished = true;
            last_lesson_id = cur_lesson_id;
            cur_lesson_id = 'end';
            selected_lesson_id = 'end';
            select_cell();//none
        }
        
        duo.SessionView.prototype.showFailView = function(){
            failed = true;
            bind_discussion_toggle();
            save_lesson(cur_lesson_id);
            r = origShowFailView.apply(this, arguments);
            finish();
            $('.close-fail').hide();
            add_arrows();
            return r;
        };
        
        duo.SessionView.prototype.showEndView = function(){
            //Timed out lessons don't need this. Timeouts will set finished to true earlier.
            cur_lesson_id -= !finished; //newNext() increments on the last one too, adjust for that.
            header = $('.player-header').detach();//TODO: Improve? 
            origShowEndView.apply(this, arguments);
            //end view won't have loaded. Wait for mouseover on end app, where the footer exists.
            $(document).on('mousemove', '#app.slide-session-end', function(){
                if ($('.session-end-footer').length){ 
                    finish(); 
                    $(document).off('mousemove', '#app.slide-session-end');
                }
            });
        };
        
        duo.TimedSessionView.prototype.timesUp = function(){
            save_lesson(cur_lesson_id);
            finished = true;
            origTimesUp.apply(this, arguments);
        };
        
        $(document).on('click.hh', 'li[id^=element-]', function(){
            var clicked_id = parseInt(this.id.replace('element-', ''), 10);
            if (lessons[clicked_id] !== undefined){
                replace_lesson(clicked_id);
            }
        });
        
        $(document).on('click.hh', '#resume_button', function(){ 
            replace_lesson(cur_lesson_id); 
            if (finished && ($('#end-carousel .left').length > 1 || !$('#end-carousel .active').length)){
                $('#end-carousel .item').removeClass('active next left');
                $('#end-carousel .item:eq(' +$('.' + (redesign ? 'carousel-' : '') + 'dots .active').data('slide')+ ')').addClass('active');
                $('#end-carousel .item.active').is(':last-child') && $(".carousel").carousel("pause");
            }
        });    
        
        $(document).on('click.hh', '#review_button', function(){
            replace_lesson(last_lesson_id);
        });
        
        $(document).on('click.hh', '#prev-arrow, #next-arrow', function(){
            lesson_id = (this.id === 'prev-arrow') ? selected_lesson_id-1 : selected_lesson_id+1;
            if (selected_lesson_id === 'end'){
                $('#review_button').click();
            }else if (!lessons[lesson_id] && cur_lesson_id === 'end'){
                replace_lesson('end');
            }else{
                replace_lesson(lesson_id);
            }
        });
        
        function add_arrows(){
            $('#prev-arrow, #next-arrow').remove();//precaution
            arrow = $('<span></span>').css({
                background: 'url("//d7mj4aqfscim2.cloudfront.net/images/sprite_mv_082bd900117422dec137f596afcc1708.png") no-repeat',
                width: '24px', height: '18px', float: 'left', 'pointer-events':'none', 'background-position': '-323px -130px'
            });

            arrow.clone().attr('id', 'prev-arrow').css({margin: redesign ? '31px 0 0 -15px' : '22px -30px 0 5px',
                     transform: 'rotate(-90deg)',
                     '-webkit-transform': 'rotate(-90deg)'
            }).prependTo('#progress-bar');

            arrow.clone().attr('id', 'next-arrow').css({margin: redesign ? '31px 0 0 0' : '22px 0 0 4px',
                     transform: 'rotate(90deg)',
                     '-webkit-transform': 'rotate(90deg)'
            }).appendTo('#progress-bar');
            
            activate_arrows();
        }
        
        function activate_arrows(){
            var active   = {'background-position':'-323px -178px',cursor:'pointer','pointer-events':''},
                inactive = {'background-position':'-323px -130px',cursor:'initial','pointer-events':'none'};
            $('#prev-arrow').css( (selected_lesson_id > 1 || selected_lesson_id === 'end') ? active : inactive);
            $('#next-arrow').css( (selected_lesson_id !== cur_lesson_id)                   ? active : inactive);
        }
    }
}
