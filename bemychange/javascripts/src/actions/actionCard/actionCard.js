import {fillUptag, getFullTag, getTagsNumber, updateSidebarTags} from "../utils";

require('../../home');
const moment = require('moment');
require('moment/locale/fr');

import * as SimpleDom from 'simpledom-component';
import {withVeilAndMessages} from '../../components/veil/veil';
import {createSlider} from '../../components/slider/slider';
import {CommentariesTab} from '../commentaries/commentaries';
import {ParticipantTab} from '../participants/participants';
import {TagSelector} from "../tagSelector/tagSelector";
import {RessourcesTab} from "../ressources/ressources";
import {ActionInfo} from "../actionInfoSlider/actionInfoSlider";

import '../../css/popovers.less';
import '../../css/avatar.less';
import './actionCard.less';
import {deleteAction, getUserActionParticipants, realiseAction} from "../../services/action";
import {changeTags} from "../../services/tag";
import {getCommentaries} from "../../services/commentary";


export class ActionCard extends SimpleDom.Component {

    eventsToSubscribe() {
        return [`ACTION_CARD_RELOAD_${this.props.userAction.id}`];
    }

    constructor(props, store) {
        super(props, store);
        this.userAction = this.props.userAction;
        this.card = undefined;
        this.tagsAsText = getFullTag(this.userAction, this.state.tags);
        this.hasBeenRealised = undefined;
    }

    static cropTitle(title, maxLength = 20) {
        if (title.length > maxLength) {
            return title.slice(0, maxLength) + '...'
        }
        return title;
    }

    static refreshSidebarTags(tags, actionsListToUpdate = true) {
        fillUptag(tags);
        const events = Array.of('SIDEBAR_TO_UPDATE', 'TITLE_TO_REFRESH');
        if (actionsListToUpdate) {
            events.push('ACTIONS_LIST_TO_UPDATE');
        }
        this.store.updateState({
                tags,
                countByTagSlug: getTagsNumber(this.state.actions)
            },
            ...events);
    }

    static formatHours(time) {
        return time.replace('une', '1').replace('un', '1').replace('heure', 'h');
    }

    getCount(kind) {
        return (this.state.actionsDataCount[kind].find(
            elem => elem.action_id === this.userAction.action_id
        ) || {}).count || 0;
    }

    getUserActionProgress() {
        const allDays = moment(this.userAction.start_date).diff(this.userAction.end_date, 'days');
        const days = moment(this.userAction.start_date).diff(moment.now(), 'days');
        const percent = Math.trunc((days / allDays) * 100);
        return Math.min(100, percent);
    }

    componentDidMount() {
        this.userAction.tags.forEach((tag, i) => {
            tippy(`#card-image-tag-${this.userAction.id}-${i}`, {
                html: document.querySelector(`#card-edit-tag-slider-${this.userAction.id}-${i}`),
                theme: 'light',
                arrow: true,
                distance: 15,
                placement: 'top',
                trigger: 'click',
                interactive: true,
                size: 'large',
                onShown: () => $(`#card-edit-tag-slider-${this.userAction.id}-${i} input`).focus()
            })
        });
    }

    render() {
        return (
            <div class="card my-card"
                 style={{'opacity': this.hasBeenRealised ? '1' : '0'}}
                 ref={ref => this.card = ref}>
                <div class="hbtn-action my-card-delete"
                     onclick={() => {
                         withVeilAndMessages(
                             deleteAction(this.userAction.id),
                             true
                         ).then(() => {
                             this.card.classList.toggle('to-be-deleted');
                             setTimeout(() => {
                                 const selectedActions = this.state.selectedActions
                                     .filter(action => action.id !== this.userAction.id);
                                 const actions = this.state.selectedActions
                                     .filter(action => action.id !== this.userAction.id);

                                 this.store.updateState({
                                     actions,
                                     selectedActions,
                                     countByTagSlug: getTagsNumber(actions)
                                 }, 'SIDEBAR_TO_UPDATE', 'ACTIONS_LIST_TO_UPDATE', 'TITLE_TO_REFRESH')
                             }, 600);
                         })
                     }}
                >
                    &#10005;
                </div>
                <div class="card-image waves-block waves-light">
                    <div class="card-image-tag-container">
                        {this.tagsAsText
                            .map((tag, i) =>
                                <div className="one-tag">
                                    <div id={`card-edit-tag-slider-${this.userAction.id}-${i}`}>
                                        <div className="tag-change-content">
                                            <h4>Changer de tag</h4>
                                            <div className="tag-change-validate">
                                                <TagSelector tags={tag} id={i}/>
                                                <a href="#" className="hbtn"
                                                   onClick={() => {
                                                       const result = updateSidebarTags(this.state);
                                                       console.log(result);
                                                       withVeilAndMessages(
                                                           changeTags(this.userAction.id, {
                                                               tagsToCreate: result.tagsToCreate,
                                                               tagsSlug: result.tagsSlug
                                                           }, this.userAction.tags[i].id),
                                                           true
                                                       ).then(({tags, user_action}) => {
                                                           this.userAction = user_action;
                                                           this.tagsAsText[i] = this.state.tagsToCreate;
                                                           this.hasBeenRealised = true;
                                                           tippy().destroyAll();
                                                           document.getElementById(
                                                               `card-image-tag-${this.userAction.id}-${i}`
                                                           )._tippy.hide();
                                                           this.store.updateState({tags}, `ACTION_CARD_RELOAD_${this.props.userAction.id}`);
                                                       })
                                                   }}
                                                >
                                                    Valider
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    <div id={`card-image-tag-${this.userAction.id}-${i}`}
                                         onClick={e => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                         }}>
                                        {tag}
                                    </div>
                                </div>
                            )}
                    </div>
                    {SimpleDom.predicate(this.userAction.action.image_url,
                        () => {
                            return (
                                <a data-fancybox
                                   data-caption={this.userAction.action.title}
                                   href={this.userAction.action.image_url}>
                                    <img class="lozad" src={this.userAction.action.image_url}/>
                                </a>
                            );
                        }
                    )}
                </div>
                <div class="card-content" data-tooltip={this.userAction.action.title}>
                    <span class="card-title" style="font-size: 1.3em;"
                          onclick={event => {
                              withVeilAndMessages(
                                  getCommentaries(this.userAction.action_id, true),
                                  true
                              ).then(commentaries => {
                                  createSlider(
                                      <ActionInfo
                                          userAction={this.userAction}
                                          tags={this.state.tags}
                                          journalEntries={commentaries}
                                          onClose={({tags, user_action}) => {
                                              this.userAction.tags = user_action.tags;
                                              fillUptag(tags);
                                              //test if the user has participated into the action, add maybe user action ?
                                              this.store.updateState({
                                                      tags,
                                                      countByTagSlug: getTagsNumber(this.state.actions)
                                                  },
                                                  'SIDEBAR_TO_UPDATE', 'ACTIONS_LIST_TO_UPDATE', 'TITLE_TO_REFRESH');
                                          }}
                                      />,
                                      event
                                  )
                              })
                          }}
                    >
                        {ActionCard.cropTitle(this.userAction.action.title, 40)}
                    </span>
                    <div class="card-content-action-info">
                        <div class="progress">
                            <div class="card-content-action-info-start-date">
                                {moment(this.userAction.start_date).format('DD/MM')}
                            </div>
                            <div class="card-content-action-info-end-date">
                                {moment(this.userAction.end_date).format('DD/MM')}
                            </div>
                            <div class="determinate" style={`width: ${this.getUserActionProgress()}%`}/>
                        </div>
                        <p>
                            <a class="hbtn-action tooltip with-pointer"
                               data-position="right"
                               data-tooltip="Voir les commentaires à propros de cette action"
                               onclick={event => {
                                   withVeilAndMessages(
                                       getCommentaries(this.userAction.action.id),
                                       true
                                   ).then(commentaries =>
                                       createSlider(
                                           <CommentariesTab
                                               action={this.userAction.action}
                                               commentaries={commentaries || []}
                                           />,
                                           event
                                       ))
                               }}
                            >
                                <div class="action-indicator">
                                    {this.getCount('commentaries')}
                                </div>
                                <span class="lnr lnr-bubble fa-2x"/>
                            </a>
                            <a class="hbtn-action with-pointer"
                               onclick={event => {
                                   withVeilAndMessages(
                                       getUserActionParticipants(this.userAction.action_id),
                                       true
                                   ).then(users => {
                                       console.log(users);
                                       const total_pages = 1;
                                       const current_page = 1;
                                       createSlider(
                                           <ParticipantTab
                                               users={users || []}
                                               action={this.userAction.action}
                                               total_pages={total_pages}
                                               current_page={current_page}
                                           />,
                                           event
                                       )
                                   })
                               }}
                            >
                                <div class="action-indicator">
                                    {this.getCount('participants')}
                                </div>
                                <span class="lnr lnr-users fa-2x"/>
                            </a>

                            <a class="hbtn-action with-pointer"
                               onclick={event => {
                                   createSlider(
                                       <RessourcesTab
                                           action={this.userAction.action}
                                       />,
                                       event
                                   );
                               }}>
                                <div class="action-indicator">
                                    {this.getCount('ressources')}
                                </div>
                                <span class="lnr lnr-book fa-2x"/>
                            </a>
                        </p>
                    </div>
                </div>
                <div class="card-action">
                    {SimpleDom.predicate(this.state.selectedDate === moment(new Date()).format('YYYY-MM-DD'),
                        () => <p>
                            {SimpleDom.predicate(
                                moment(this.userAction.last_succeed).format('YYYY-MM-DD') === moment(new Date()).format('YYYY-MM-DD'),
                                () => <div class="action-checked"><p><span class="fa fa-check-square-o"/> 1 point
                                    gagné !</p></div>,
                                () => <div class="action-to-check">
                                    <a href="#"
                                       onclick={e => {
                                           e.preventDefault();
                                           withVeilAndMessages(
                                               realiseAction(this.userAction.id),
                                               true
                                           ).then(userAction => {
                                               this.userAction = userAction;
                                               this.hasBeenRealised = true;
                                               let action = this.state.actions.find(action => action.id === userAction.id);
                                               action.last_succeed = userAction.last_succeed;
                                               this.store.updateState({}, `ACTION_CARD_RELOAD_${this.props.userAction.id}`);
                                               const pointCounter = document.getElementsByClassName('point-counter')[0];
                                               if (pointCounter) {
                                                   const str = +pointCounter.innerHTML.split(' ')[0] + 1;
                                                   pointCounter.innerHTML = str + ' pts';
                                               }
                                           })
                                       }}
                                    >
                                        <span class="fa fa-check"/> Réalisé !
                                    </a>
                                </div>
                            )}
                        </p>
                    )}
                </div>
            </div>
        );
    }
}