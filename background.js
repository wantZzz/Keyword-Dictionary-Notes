//外部腳本資料
var currentpage_TabId = null;
var is_CurrentPageSearch = false;
var is_SidepanelON = false;
var waiting_RefreshPage = null;

var portWithSidepanel = null;
//通用設定資料
var setting = {
	is_DarkMode: true,
	is_SwitchWithTab: true
}

var confirmnotifications_Data = {};//{confirm_notification_ids: {json_data}}
//儲存資料
const keyword_reserved_words = ['KeywordsNotePriority', 'RecordedKeywords', 'KeywordsSetting', 'AutoTriggerUrl', 'KeywordsDisplayCRF', 'max_KeywordDisplay'];
const keyword_special_urls = ['www.google.com', 'www.bing.com', 'www.youtube.com', 'www.twitch.tv', 'forum.gamer.com.tw', 'home.gamer.com.tw'];

var recorded_Keywords = [];
var current_Keyword = '';

// ====== 資料回傳 ====== 
function responseCurrentPageStatus(callback){
	if (currentpage_TabId == null){
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
		  currentpage_TabId = tabs[0].id;
		  responseCurrentPageStatus(callback);
		});
		return;
	}
	chrome.tabs.get(currentpage_TabId).then((currentpage_info) => {
		if (!currentpage_info.url){
			const current_tab_info = {
				page_status: null,
				is_support: false,
				is_script_run: false
			};
			
			is_CurrentPageSearch = false;
			callback(current_tab_info);
			chrome.action.setBadgeText({tabId: currentpage_TabId, text: '✕'}, (t) => {});
			chrome.action.setBadgeBackgroundColor({tabId: currentpage_TabId, color: '#F9F900'}, (t) => {});
		}
		else if (currentpage_info.url.startsWith('https://') || currentpage_info.url.startsWith('https://')){
			const quest_tab_message = {
				event_name: 'quest-tab-status',
				tab_id: currentpage_TabId
			};
			
			chrome.tabs.sendMessage(currentpage_TabId, quest_tab_message, (response) => {
				if(chrome.runtime.lastError){
					const current_tab_info = {
						page_status: null,
						is_support: true,
						is_script_run: false
					};
					
					is_CurrentPageSearch = false;
					callback(current_tab_info);
					
					chrome.action.setBadgeText({tabId: currentpage_TabId, text: '！'}, (t) => {});
					chrome.action.setBadgeBackgroundColor({tabId: currentpage_TabId, color: '#EA0000'}, (t) => {});
				
					waiting_RefreshPage = currentpage_TabId;
				}
				else{
					response.is_special_urls = keyword_special_urls.includes(response.host)
					const current_tab_info = {
						page_status: response,
						is_support: true,
						is_script_run: true
					};
					
					is_CurrentPageSearch = response.is_areadysearch;
					callback(current_tab_info);
					

					if (!is_CurrentPageSearch){
						chrome.action.setBadgeText({tabId: currentpage_TabId, text: ''}, (t) => {});
					}
				}
			});
		}
		else{
			const current_tab_info = {
				page_status: null,
				is_support: false,
				is_script_run: false
			};
			
			is_CurrentPageSearch = false;
			callback(current_tab_info);
			chrome.action.setBadgeText({tabId: currentpage_TabId, text: '✕'}, (t) => {});
			chrome.action.setBadgeBackgroundColor({tabId: currentpage_TabId, color: '#F9F900'}, (t) => {});
		}
	});
}

function responseSetting(callback){
	callback({is_darkmode: setting['is_DarkMode'],
			  is_switchwithtab: setting['is_SwitchWithTab'],
			  current_Keyword: current_Keyword
			  });
}

function responseSidepanelOn(callback){
	callback({is_sidepanelon: is_SidepanelON});
}

function responseRecordedKeywords(callback){
	/*let recorded_Keywords_response = {};
	
	recorded_Keywords.forEach(function (Keyword) {
		recorded_Keywords_response[Keyword] = 0;
	});
	
	callback({recorded_keywords: recorded_Keywords_response});*/
	callback({recorded_keywords: recorded_Keywords});
}

function responseKeywordsNoteData(keyword, callback){
	getKeywordData(keyword, (result, is_exist) => {
		if (is_exist){
			callback(result);
			//updateDisplayCRF(keyword);
		}
		else{
			callback(null);
		}
	});
}

function responseUrlNoteData(host, callback){
	getKeywordData(host, (result, is_exist) => {
		if (is_exist){
			callback(result);
		}
		else{
			callback(null);
		}
	});
}

function responseContentKeywordsNoteData(keyword, callback){
	responseKeywordsNoteData(keyword, (keyword_notedata) => {
		getNotePriority(keyword, (keywords_priority) => {
			const response_keyword_notedata = {
				event_name: 'response-keyword-notedata-content',
				keyword: keyword
			};
			
			if (keyword_notedata == null){
				response_keyword_notedata.keyword_notedata = null;
			}
			else if (keyword_notedata.length <= 0){
				response_keyword_notedata.keyword_notedata = null;
			}
			else if (keywords_priority == -1){
				response_keyword_notedata.keyword_notedata = keyword_notedata[keyword_notedata.length - 1];
			}
			else{
				response_keyword_notedata.keyword_notedata = keyword_notedata[keywords_priority[0]] ? keyword_notedata[keywords_priority[0]] : keyword_notedata[keyword_notedata.length - 1];
			}
			
			callback(response_keyword_notedata);
		});
	});
}

function responseSidepanelKeywordsNoteData(keyword, is_first, callback){
	responseKeywordsNoteData(keyword, (keyword_notedata) => {
		if (keyword_notedata == null){
			callback(null, null);
		}
		else{
			getNotePriority(keyword, (keywords_priority) => {
				if (keywords_priority == -1){
					callback(keyword_notedata, []);
				}
				else{
					callback(keyword_notedata, keywords_priority);
				}
			});
			
			if (!is_first){
				updateDisplayCRF(keyword);
			}
		}
	});
}

function responseSidepanelUrlNoteData(host, callback){
	responseUrlNoteData(host, (keyword_notedata) => {
		if (keyword_notedata == null){
			callback(null, null);
		}
		else{
			getNotePriority(host, (keywords_priority) => {
				if (keywords_priority == -1){
					callback(keyword_notedata, []);
				}
				else{
					callback(keyword_notedata, keywords_priority);
				}
			});
		}
	});
}

function responseSidepanelSpecialUrlNoteData(title, host, url, callback){
	let is_match = false;
	switch(host){
		case 'www.google.com':
			const google_url = new URL(url);

			if (google_url.searchParams.has('q')){
				is_match = true;
				const google_key_index = host + ':' + google_url.searchParams.get('q');
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="-2 -2 24 24" style="position: relative;top: calc(50% - 0.5em);">
									  	<g fill="currentColor">
									  		<path d="M7.188 9.034a2.972 2.972 0 0 0 .028 2.01a2.973 2.973 0 0 0 4.285 1.522a2.98 2.98 0 0 0 1.283-1.522H10.11V9.066h4.803a5.005 5.005 0 0 1-1.783 4.833A5 5 0 1 1 10 5a4.982 4.982 0 0 1 3.191 1.152l-1.62 1.326a2.974 2.974 0 0 0-4.384 1.557z" />
									  		<path d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0-2h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4" />
									  	</g>
									  </svg>
									  ${title.slice(0, title.indexOf(' - '))}`;
				
				responseUrlNoteData(google_key_index, (google_notedata) => {
					if (google_notedata == null){
						callback(output_title, google_key_index, null, null);
					}
					else{
						getNotePriority(host, (google_priority) => {
							if (google_priority == -1){
								callback(output_title, google_key_index, google_notedata, []);
							}
							else{
								callback(output_title, google_key_index, google_notedata, google_priority);
							}
						});
					}
				});
			}
			break;
		case 'www.bing.com':
			const bing_url = new URL(url);
			let bing_pathnames = bing_url.pathname;
			bing_pathnames = bing_pathnames.slice(1).split('/')
			
			if ((bing_pathnames[0] == 'search') && bing_url.searchParams.has('q')){
				is_match = true;
				const bing_key_index = host + ':' + bing_url.searchParams.get('q');
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" style="position: relative;top: calc(50% - 0.5em);">
										<path fill="currentColor" d="m10.129 8.596l1.735 4.328l2.77 1.29L19 16.247V11.7z" opacity="0.7" />
										<path fill="currentColor" d="M14.634 14.214L9 17.457V3.4L5 2v17.76L9 22l10-5.753V11.7z" />
									  </svg>
									  ${title.slice(0, title.indexOf(' - '))}`;
				
				responseUrlNoteData(bing_key_index, (bing_notedata) => {
					if (bing_notedata == null){
						callback(output_title, bing_key_index, null, null);
					}
					else{
						getNotePriority(host, (bing_priority) => {
							if (bing_priority == -1){
								callback(output_title, bing_key_index, bing_notedata, []);
							}
							else{
								callback(output_title, bing_key_index, bing_notedata, bing_priority);
							}
						});
					}
				});
			}
			break;
		case 'www.youtube.com':
			const youtube_url = new URL(url);

			if (youtube_url.searchParams.has('v')){
				is_match = true;
				const youtube_key_index = host + ':' + youtube_url.searchParams.get('v');
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" style="position: relative;top: calc(50% - 0.5em);">
										<path fill="currentColor" d="m10 15l5.19-3L10 9zm11.56-7.83c.13.47.22 1.1.28 1.9c.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83c-.25.9-.83 1.48-1.73 1.73c-.47.13-1.33.22-2.65.28c-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44c-.9-.25-1.48-.83-1.73-1.73c-.13-.47-.22-1.1-.28-1.9c-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83c.25-.9.83-1.48 1.73-1.73c.47-.13 1.33-.22 2.65-.28c1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44c.9.25 1.48.83 1.73 1.73"></path>
									  </svg>
									  ${title.replace(/\(\d+\) /, '').slice(0, -10)}`;
				
				responseUrlNoteData(youtube_key_index, (youtube_notedata) => {
					if (youtube_notedata == null){
						callback(output_title, youtube_key_index, null, null);
					}
					else{
						getNotePriority(host, (youtube_priority) => {
							if (youtube_priority == -1){
								callback(output_title, youtube_key_index, youtube_notedata, []);
							}
							else{
								callback(output_title, youtube_key_index, youtube_notedata, youtube_priority);
							}
						});
					}
				});
			}
			break;
		case 'www.twitch.tv':
			const twitch_url = new URL(url);
			let twitch_pathnames = twitch_url.pathname;
			twitch_pathnames = twitch_pathnames.slice(1).split('/')
			
			if (twitch_pathnames.length == 1 && Boolean(twitch_pathnames[0])){
				is_match = true;
				const twitch_key_index = host + ':' + twitch_pathnames[0];
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" style="position: relative;top: calc(50% - 0.5em);">
										<path fill="currentColor" d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43Z" />
									  </svg>
									  ${title.slice(0, -9)}`;
									  
				if (title == 'Twitch'){
					break;
				}
				
				responseUrlNoteData(twitch_key_index, (twitch_notedata) => {
					if (twitch_notedata == null){
						callback(output_title, twitch_key_index, null, null);
					}
					else{
						getNotePriority(host, (twitch_priority) => {
							if (twitch_priority == -1){
								callback(output_title, twitch_key_index, twitch_notedata, []);
							}
							else{
								callback(output_title, twitch_key_index, twitch_notedata, twitch_priority);
							}
						});
					}
				});
			}
			break;
		case 'forum.gamer.com.tw':
			const forumgamer_url = new URL(url);
			
			if (forumgamer_url.searchParams.has('bsn')){
				is_match = true;
				const forumgamer_key_index = host + ':' + forumgamer_url.searchParams.get('bsn');
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 40 40" style="position: relative;top: calc(50% - 0.5em);">
											<path fill="currentColor" d="M 35 4 l 1 1 l 0 1 l -1 -1 l -2 5 q -0.3 1 0.5 2 l 3 -2.6 l -2 -0.2 q 1 0 2.5 -0.5 q 0 -0.4 -2 -0.4 l 3.018 -0.2 l 1 0.6 l 0.6 0 l 0.5 1 l -1 1 l -1 -1 l -1 1 q 0.2 1 0 2 l 2 -0.3 l 0.6 1 l -1 1 l -0.5 -1 l -2 1 l -1 -0.2 l -2 1 q 0.2 4 -3 3 l -0.921 1.4 q 6 -0.4 8 4 a 1 1 0 0 0 -11 7 q 3 5 10 2.5 a 1 1 0 0 1 -11 -11 q 1 -1 2.5 -2 q 0 -2 0.6 -2 q 0.8 1 2 -2 c -11 6 -10 -0.726 -20 1 c 13 -2 11 4 20 -4 q -3 -1 -8 3 q 4 -8 -8 -2 q 10 -8 -13 -9 l 12 -2 l -12 -2 q 23 -3 33 3 z" />
									  </svg>
									  ${title.slice(title.indexOf('@') + 1, title.indexOf(' - ')) }`;
				
				responseUrlNoteData(forumgamer_key_index, (forumgamer_notedata) => {
					if (forumgamer_notedata == null){
						callback(output_title, forumgamer_key_index, null, null);
					}
					else{
						getNotePriority(host, (forumgamer_priority) => {
							if (forumgamer_priority == -1){
								callback(output_title, forumgamer_key_index, forumgamer_notedata, []);
							}
							else{
								callback(output_title, forumgamer_key_index, forumgamer_notedata, forumgamer_priority);
							}
						});
					}
				});
			}
			break;
		case 'home.gamer.com.tw':
			const homegamer_url = new URL(url);
			let homegamer_pathnames = homegamer_url.pathname;
			homegamer_pathnames = homegamer_pathnames.slice(1).split('/')
			
			if (['artwork.php', 'creationDetail.php'].includes(homegamer_pathnames[0])){
				is_match = true;
				const homegamer_key_index = host + ':' + title.slice(title.indexOf(' - ') + 3, title.indexOf('的創作'));
				
				if (homegamer_key_index == (host + ':')){
					break;
				}
				
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32" style="position: relative;top: calc(50% - 0.5em);">
											<path fill="currentColor" d="M20.917 6.883l.7 0 .8-.3q.85 2 1.4 2.15-.1 1 .1 2.27-1.5-3.2-2.25-2.5l-1 2.2q0 1 .7 2.2-.6-.5-1-1.5l-3.3 7.4q.04 1.4 1.18 2.6l1.45-.3-.85-.35 2.05-.4q-.3.15-.8-.6l2-.7-1.3.1 2.5-1.4 1.35-1.2q-2.7.4-5 0l5.5-1q-1-.7-4.5-.6 1-.6 6.8-.5l2.6 1.1q.6-.5 1.1 1.2l-.2.25q-.154-.433-.4-.5l-.1.3-.4-.4-1.2 0-.7.7q.5 1 1 1l.19-.1.02.1.8 0-1 .7q-.2-.5-2-.6l-1.5 2-.1 2-.5 1 3.6-.4 2 1.3-.7 1.7-.117-.441-1 1-.1-1-1.2.8.3-1.4-4 1.5-3 0-1 1q-5 1.8-10-1l2-.2 1.4-1.5q-3-2-10 1l2.4-2.4q-8-13 8-20zm7.4 8.7-2-.3 1 .7z" />
									  </svg>
									  ${title.slice(title.lastIndexOf(' - ', title.indexOf('的創作')) + 3, title.indexOf('的創作'))}`;
				
				responseUrlNoteData(homegamer_key_index, (homegamer_notedata) => {
					if (homegamer_notedata == null){
						callback(output_title, homegamer_key_index, null, null);
					}
					else{
						getNotePriority(host, (homegamer_priority) => {
							if (homegamer_priority == -1){
								callback(output_title, homegamer_key_index, homegamer_notedata, []);
							}
							else{
								callback(output_title, homegamer_key_index, homegamer_notedata, homegamer_priority);
							}
						});
					}
				});
			}
			else if (homegamer_url.searchParams.has('owner')){
				is_match = true;
				const homegamer_key_index = host + ':' + homegamer_url.searchParams.get('owner');
				
				if (homegamer_key_index == (host + ':')){
					break;
				}
				
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32" style="position: relative;top: calc(50% - 0.5em);">
											<path fill="currentColor" d="M20.917 6.883l.7 0 .8-.3q.85 2 1.4 2.15-.1 1 .1 2.27-1.5-3.2-2.25-2.5l-1 2.2q0 1 .7 2.2-.6-.5-1-1.5l-3.3 7.4q.04 1.4 1.18 2.6l1.45-.3-.85-.35 2.05-.4q-.3.15-.8-.6l2-.7-1.3.1 2.5-1.4 1.35-1.2q-2.7.4-5 0l5.5-1q-1-.7-4.5-.6 1-.6 6.8-.5l2.6 1.1q.6-.5 1.1 1.2l-.2.25q-.154-.433-.4-.5l-.1.3-.4-.4-1.2 0-.7.7q.5 1 1 1l.19-.1.02.1.8 0-1 .7q-.2-.5-2-.6l-1.5 2-.1 2-.5 1 3.6-.4 2 1.3-.7 1.7-.117-.441-1 1-.1-1-1.2.8.3-1.4-4 1.5-3 0-1 1q-5 1.8-10-1l2-.2 1.4-1.5q-3-2-10 1l2.4-2.4q-8-13 8-20zm7.4 8.7-2-.3 1 .7z" />
									  </svg>
									  ${homegamer_url.searchParams.get('owner')}`;
				
				responseUrlNoteData(homegamer_key_index, (homegamer_notedata) => {
					if (homegamer_notedata == null){
						callback(output_title, homegamer_key_index, null, null);
					}
					else{
						getNotePriority(host, (homegamer_priority) => {
							if (keywords_priority == -1){
								callback(output_title, homegamer_key_index, homegamer_notedata, []);
							}
							else{
								callback(output_title, homegamer_key_index, homegamer_notedata, homegamer_priority);
							}
						});
					}
				});
			}
			break;
	}
	
	if (!is_match){
		responseSidepanelUrlNoteData(host, (host_notedata, keywords_priority) => {
			const response_host_notedata = {
				event_name: 'response-url-notedata',
				host: host,
				host_notedata: host_notedata,
				keywords_priority: keywords_priority
			};
			chrome.runtime.sendMessage(response_host_notedata, (t) => {});
		});
	}
}

// ====== 訊息傳遞 ====== 
function triggerNotificationMessage(message, type){
	const options = {
	  type: "basic",
	  iconUrl: "./images/icon.png",
	  title: "❓ 未知通知類型",
	  message: message
	};
	
	switch (type) {
		case 'error':
			//alertContainer.style.backgroundColor = '#EA0000';
			options.title = '✖ 執行中發生錯誤';
			break;

		case 'nofound':
			//alertContainer.style.backgroundColor = '#FFD306';
			options.title = '! 找不到索要的目標資料';
			break;
			
		case 'warning':
			//alertContainer.style.backgroundColor = '#FFD306';
			options.title = '! 該操作觸發警告';
			break;

		case 'ok':
			//alertContainer.style.backgroundColor = '#00A600';
			options.title = '✔ 操作順利完成';
			break;

		default:
			options.title = '❓ 未知通知類型';
	}
	
	chrome.notifications.create(options, (notificationId) => {
		setTimeout(() => {
			chrome.notifications.clear(notificationId, (wasCleared) => {});
		}, 5000);
	});
}

function confirmNotificationMessage(message, type, senddata){
	const options = {
	  type: "basic",
	  iconUrl: "../images/icon.png",
	  title: "! 執行動作前確認",
	  message: message
	};
	
	switch (type) {
		case 'new_version':
			options.title = "✔ 有新版本可用";
			options.buttons = [{
				title: "前往新版本下載"
			}, {
				title: "下個版本再說吧"
			}];
			break;
		default:
			options.title = "! 執行動作前確認";
			options.buttons = [{
				title: "確認動作"
			}, {
				title: "取消動作"
			}];
	}
	
	chrome.notifications.create(options, function(notificationId) {
		confirmnotifications_Data[notificationId] = senddata;
		
		setTimeout(() => {
			if (Boolean(confirmnotifications_Data[notificationId])) {
				delete confirmnotifications_Data[notificationId];
				
				chrome.notifications.clear(notificationId, (wasCleared) => {});
			}
		}, 10000);
	});
}

// ====== 資料處理 ====== 
function datetimeOutputFormat(){
	let currentdate = new Date();
	let datetime = currentdate.getFullYear() + "/"
	+ (currentdate.getMonth()+1).toString().padStart(2,'0') + "/"
	+ currentdate.getDate().toString().padStart(2,'0') + " "
	+ currentdate.getHours().toString().padStart(2,'0') + ":"
	+ currentdate.getMinutes().toString().padStart(2,'0') + ":"
	+ currentdate.getSeconds().toString().padStart(2,'0');

	return datetime
}

function checkForNewRelease(){
	questInitialSetting('github_', (github_data) => {
		if ((Date.now() - github_data['notify_time']) > 1209600000){
			const apiURL = 'https://api.github.com/repos/wantZzz/Keyword-Dictionary-Notes/releases/latest';
				
			fetch(apiURL)
			.then(response => response.json())
			.then(data => {
				const latest_version = data.tag_name;
				
				console.log(latest_version);
				console.log(github_data['version']);
				
				if (github_data['version'] != latest_version){
					const consequences = compareVersion(latest_version, github_data['version']);
					
					//console.log(consequences);
					if (consequences > 0){
						const send_url_note_delete = {
							notification_type: 'new_version',
							latest_version: latest_version
						};

						confirmNotificationMessage(`新版本 ${latest_version} 已經釋出\n你可以選擇是否前往更新`, 'new_version', send_url_note_delete);
						
						github_data['notify_time'] = Date.now();
						settingInitialSetting('github_', github_data, () => {});
					}
					else{
						github_data['notify_time'] += 302400000;
						settingInitialSetting('github_', github_data, () => {});
					}
				}
				else{
					github_data['notify_time'] = Date.now();
					settingInitialSetting('github_', github_data, () => {});
				}
			});
		}
	});
}

function compareVersion(v1, v2, callback){
	const parseVersion = (version) => {
		if (version.startsWith('v')){
			version = version.slice(1);
		}
		
		const [version_Suffix, version_BetaOrAlpha] = version.split('-');
		
		const [major, minor, patch] = version_Suffix.split('.').map(Number);
		return { major, minor, patch };
	};
	
	const v1_parses = parseVersion(v1);
	const v2_parses = parseVersion(v2);
	
	if (v1_parses.major !== v2_parses.major) {
		return v1_parses.major > v2_parses.major ? 1 : -1;
		return
	}
	if (v1_parses.minor !== v2_parses.minor) {
		return v1_parses.minor > v2_parses.minor ? 1 : -1;
	}
	if (v1_parses.patch !== v2_parses.patch) {
		return v1_parses.patch > v2_parses.patch ? 1 : -1;
	}
	
	const isBetaOrAlpha = (version) => version.includes('-');
	if (isBetaOrAlpha(v1) && isBetaOrAlpha(v2)) {
		const [v1Suffix, v1BetaOrAlpha] = v1.split('-');
		const [v2Suffix, v2BetaOrAlpha] = v2.split('-');

		if (v1Suffix === v2Suffix) {
			const v1Num = parseInt(v1BetaOrAlpha.split('.')[1]);
			const v2Num = parseInt(v2BetaOrAlpha.split('.')[1]);
			return v1Num - v2Num;
		}
	}
	else if(isBetaOrAlpha(v1) || isBetaOrAlpha(v2)){
		return isBetaOrAlpha(v2) ? 1 : -1;
	}
	
	callback(0);
}

function reloadKeywordlist(callback){
	chrome.storage.local.get(['RecordedKeywords']).then((result) => {
		if (result.RecordedKeywords == undefined){
			callback([]);
		}
		else{
			callback(result.RecordedKeywords);
		}
	});
}
	
function getKeywordData(keyword, callback){
	chrome.storage.local.get([keyword]).then((result) => {
		if(result.hasOwnProperty(keyword)){
			callback(result[keyword], true);
		}
		else{
			callback(null, false);
		}
	});
}

function getNotePriority(keyword, callback){
	chrome.storage.local.get(["KeywordsNotePriority"]).then((result) => {
		if(result.KeywordsNotePriority.hasOwnProperty(keyword)){
			callback(result.KeywordsNotePriority[keyword]);
		}
		else{
			callback(-1);
		}
	});
}

function addNotePriority(keyword, note_id, callback){
	chrome.storage.local.get(["KeywordsNotePriority"]).then((result) => {
		if(result.KeywordsNotePriority.hasOwnProperty(keyword)){
			let keywordsNote_priority = result.KeywordsNotePriority;
			keywordsNote_priority[keyword].splice(0, 0, note_id);
			chrome.storage.local.set({KeywordsNotePriority: keywordsNote_priority}).then(() => {
				callback(true);
			});
		}
		else{
			let keywordsNote_priority = result.KeywordsNotePriority;
			keywordsNote_priority[keyword] = [note_id];
			chrome.storage.local.set({KeywordsNotePriority: keywordsNote_priority}).then(() => {
				callback(true);
			});
		}
	});
}

function removeNotePriority(keyword, note_id, callback){
	chrome.storage.local.get(["KeywordsNotePriority"]).then((result) => {
		if(result.KeywordsNotePriority.hasOwnProperty(keyword)){
			let keywordsNote_priority = result.KeywordsNotePriority;
			
			const remove_index = keywordsNote_priority[keyword].indexOf(note_id);
			if (remove_index >= 0){
				keywordsNote_priority[keyword].splice(remove_index, 1);
				chrome.storage.local.set({KeywordsNotePriority: keywordsNote_priority}).then(() => {
					callback(true);
				});
			}
			else{
				callback(false);
			}
		}
		else{
			callback(false);
		}
	});
}

function deleteNotePriority(keyword, note_id, callback){
	chrome.storage.local.get(["KeywordsNotePriority"]).then((result) => {
		if(result.KeywordsNotePriority.hasOwnProperty(keyword)){
			let keywordsNote_priority = result.KeywordsNotePriority;
			
			const remove_index = keywordsNote_priority[keyword].indexOf(note_id);
			if (remove_index >= 0){
				for (let i = 0; i < keywordsNote_priority[keyword].length; i++){
					if (keywordsNote_priority[keyword][i] > note_id){
						keywordsNote_priority[keyword][i] -= 1;
					}
				}
				keywordsNote_priority[keyword].splice(remove_index, 0);
				chrome.storage.local.set({KeywordsNotePriority: keywordsNote_priority}).then(() => {
					callback(true);
				});
			}
			else{
				callback(false);
			}
		}
		else{
			callback(false);
		}
	});
}

function checkIsINAutoStartup(domain_name, callback){
	chrome.storage.local.get(["AutoTriggerUrl"]).then((result) => {
		if(result.AutoTriggerUrl.hasOwnProperty(domain_name)){
			callback(true);
		}
		else{
			callback(false);
		}
	});
}

function addinAutostartupList(domain_name, callback){
	chrome.storage.local.get(["AutoTriggerUrl"]).then((result) => {
		if(!result.AutoTriggerUrl.includes(domain_name)){
			let new_autotriggerurl = result.AutoTriggerUrl;
			new_autotriggerurl.push(domain)
			
			chrome.storage.local.set(new_autotriggerurl).then(() => {
				callback(true);
			});
		}
		else{
			callback(true);
		}
	});
}

function removeoutAutostartupList(domain_name, callback){
	chrome.storage.local.get(["AutoTriggerUrl"]).then((result) => {
		if(result.AutoTriggerUrl.includes(domain_name)){
			let new_autotriggerurl = result.AutoTriggerUrl;
			const new_domainindex = result.AutoTriggerUrl.indexOf(domain);
			
			if (new_domainindex > -1) {
			  new_autotriggerurl.splice(index, 1);
			}
			chrome.storage.local.set(new_autotriggerurl).then(() => {
				callback(true);
			});
		}
		else{
			callback(true);
		}
	});
}

function questInitialSetting(setting_name, callback, try_time = 0){
	chrome.storage.local.get(["KeywordsSetting"]).then((result) => {
		if (result.KeywordsSetting == undefined){
			if (try_time < 3){
				setTimeout(() => {
					questInitialSetting(setting_name, callback, try_time + 1);
				}, 1000);
			}
			else{
				callback(null);
			}
		}
		if(result.KeywordsSetting.hasOwnProperty(setting_name)){
			callback(result.KeywordsSetting[setting_name]);
		}
		else{
			callback(null);
		}
	});
}

function settingInitialSetting(setting_name, value, callback){
	chrome.storage.local.get(["KeywordsSetting"]).then((result) => {
		let new_keywordssetting = result.KeywordsSetting;
		new_keywordssetting[setting_name] = value;
		
		if (Object.keys(setting).includes(setting_name)){
			setting[setting_name] = value;
		}
			
		chrome.storage.local.set({KeywordsSetting: new_keywordssetting}).then(() => {
			callback(true);
		});
	});
}

function addNewKeyword(new_keyword, note, callback){
	if(keyword_reserved_words.includes(new_keyword)){
		triggerNotificationMessage("這個關鍵字為系統保留字，無法新增", 'error');
		callback(false, null);
		return;
	}
	if(recorded_Keywords.includes(new_keyword)){
		triggerNotificationMessage("該關鍵字已存在", 'error');
		callback(false, null);
		return;
	}

	chrome.storage.local.get([new_keyword]).then((result) => {
		if (result.hasOwnProperty(new_keyword)){
			triggerNotificationMessage("該關鍵字已被占用或關鍵字為一段已記錄網址", 'error');
			callback(false, null);
			return;
		}
		
		let recorded_Keywords_copy = recorded_Keywords;
		recorded_Keywords_copy.push(new_keyword);
		let data = [];
		let new_datetime = null;
		
		if(note !== ""){
			const new_datetime = datetimeOutputFormat();
			data = [[note, new_datetime, false]];
		}else{
			const new_datetime = null;
			data = [];
		}
		
		chrome.storage.local.set({[new_keyword]: data}).then((result) => {
			chrome.storage.local.set({RecordedKeywords: recorded_Keywords_copy}).then(() => {
				callback(true, new_datetime);
				recorded_Keywords = recorded_Keywords_copy;
				
				triggerNotificationMessage("關鍵字索引已新增", 'ok');
			});
		});
	});
}

function deleteKeyword(keyword, callback){
	if(keyword_reserved_words.includes(keyword)){
		triggerNotificationMessage("這個關鍵字為系統保留字，無法移除", 'error');
		callback(false);
		return;
	}
	if(!recorded_Keywords.includes(keyword)){
		triggerNotificationMessage("該關鍵字不存在", 'error');
		callback(false);
		return;
	}

	let recorded_Keywords_copy = recorded_Keywords;
	const Keywords_index = recorded_Keywords_copy.indexOf(keyword);
	
	if (Keywords_index > -1) {
	  recorded_Keywords_copy.splice(Keywords_index, 1);
	}
	
	
	chrome.storage.local.remove([keyword]).then(() => {
		chrome.storage.local.set({RecordedKeywords: recorded_Keywords_copy}).then(() => {
			callback(true);
			recorded_Keywords = recorded_Keywords_copy;
			
			triggerNotificationMessage("關鍵字索引已刪除", 'ok');
		});
	});
	
	chrome.storage.local.get(["KeywordsNotePriority"]).then((result) => {
		if(result.KeywordsNotePriority.hasOwnProperty(keyword)){
			let keywordsNote_priority = result.KeywordsNotePriority;
			delete keywordsNote_priority[keyword];
			
			chrome.storage.local.set({KeywordsNotePriority: keywordsNote_priority}).then(() => {});
		}
	});
	
	chrome.storage.local.get(["KeywordsDisplayCRF"]).then((result) => {
		let DisplayCRF = result.KeywordsDisplayCRF;
		
		for (let i = 0; i < DisplayCRF.length - 1; i++){
			if (DisplayCRF[i][0] == keyword){
				DisplayCRF.splice(i, 1);
				break;
			}
		}
		
		chrome.storage.local.set({KeywordsDisplayCRF: DisplayCRF}).then(() => {});
		if (current_Keyword == keyword){
			current_Keyword = DisplayCRF[0][0];
		}
	});
}

function addNewUrl(new_host, note, is_special_url, callback){
	let data = [];
	let new_datetime = null;
	
	if(recorded_Keywords.includes(new_host)){
		triggerNotificationMessage("該網址已被某個關鍵字占用", 'error');
		callback(false, null);
		return;
	}
	
	if(note !== ""){
		new_datetime = datetimeOutputFormat();
		data = [[note, new_datetime, false]];
	}else{
		new_datetime = null;
		data = [];
	}
	
	chrome.storage.local.set({[new_host]: data}).then((result) => {
		callback(true, new_datetime);
		
		triggerNotificationMessage("網址索引已新增", 'ok');
	});
	
	addUrlIndex(new_host, is_special_url);
}

function deleteUrl(host, is_special_url, callback){
	chrome.storage.local.remove([host]).then(() => {
		callback(true);
		
		triggerNotificationMessage("網址索引已刪除", 'ok');
	});
	
	chrome.storage.local.get(["KeywordsNotePriority"]).then((result) => {
		if(result.KeywordsNotePriority.hasOwnProperty(host)){
			let keywordsNote_priority = result.KeywordsNotePriority;
			delete keywordsNote_priority[host];
			
			chrome.storage.local.set({KeywordsNotePriority: keywordsNote_priority}).then(() => {});
		}
	});

	removeUrlIndex(host, is_special_url);
}

function editKeyword(new_keyword, old_keyword, callback){
	if(keyword_reserved_words.includes(new_keyword)){
		triggerNotificationMessage("這個關鍵字為系統保留字，無法新增", 'error');
		callback(false);
		return;
	}
	if(recorded_Keywords.includes(new_keyword)){
		triggerNotificationMessage("該關鍵字已存在", 'error');
		callback(false);
		return;
	}
	
	let recorded_Keywords_copy = recorded_Keywords;
	const old_keyword_index = recorded_Keywords_copy.indexOf(old_keyword);
	recorded_Keywords_copy.push(new_keyword);
	if (old_keyword_index > -1) {
	  recorded_Keywords_copy.splice(old_keyword_index, 1);
	}
	
	chrome.storage.local.get([old_keyword]).then((result) => {
		chrome.storage.local.set({[new_keyword]: result.old_keyword}).then(() => {
			chrome.storage.local.remove([old_keyword]).then(() => {
				chrome.storage.local.set({RecordedKeywords: recorded_Keywords_copy}).then(() => {
					callback(true);
					recorded_Keywords = recorded_Keywords_copy;
					
					triggerNotificationMessage("關鍵字修改成功", 'ok');
				});
			});
		});
	});
}

function addKeywordNote(keyword, note, callback){
	chrome.storage.local.get([keyword]).then((result) => {
		if(!result.hasOwnProperty(keyword)){
			triggerNotificationMessage("無法儲存該筆記 錯誤: keyword does not exist", 'error');
			callback(false, null);
			return;
		}
		else{
			try{
				const new_datetime = datetimeOutputFormat();
				let new_keyword_data = result[keyword];

				new_keyword_data.push([note, new_datetime, false]);
				
				chrome.storage.local.set({[keyword]: new_keyword_data}).then(() => {
					triggerNotificationMessage("筆記內容已儲存", 'ok');

					callback(true, new_datetime);
				});
			}catch(e){
				triggerNotificationMessage("無法儲存該筆記 錯誤:" + e.name, 'error');
				console.log(e)

				callback(false, null);
				return;
			}
		}
	})
	.catch((error) => {
		triggerNotificationMessage("無法儲存該筆記 錯誤:" + error.name, 'error');
		console.log(error)

		callback(false, null);
		return;
	});
}

function deleteKeywordNote(keyword, keyword_data_id, callback){
	chrome.storage.local.get([keyword]).then((result) => {
		if(!result.hasOwnProperty(keyword)){
			triggerNotificationMessage("無法刪除該筆記 錯誤: keyword does not exist", 'error');
			callback(false);
			return;
		}
		else{
			try{
				let new_keyword_data = result[keyword];
				
				new_keyword_data.splice(keyword_data_id, 1);
				chrome.storage.local.set({[keyword]: new_keyword_data}).then(() => {
					triggerNotificationMessage("筆記已刪除", 'ok');

					callback(true);
				});
			}catch(e){
				triggerNotificationMessage("無法刪除該筆記 錯誤:" + e.name, 'error');
				console.log(e)

				callback(false);
				return;
			}
		}
	});
}

function editKeywordNote(keyword, note, keyword_data_id, callback){
	chrome.storage.local.get([keyword]).then((result) => {
		if(!result.hasOwnProperty(keyword)){
			triggerNotificationMessage("無法編輯該筆記 錯誤: keyword does not exist", 'error');
			callback(false);
			return;
		}
		else{
			try{
				const new_datetime = datetimeOutputFormat();
				let new_keyword_data = result[keyword];

				new_keyword_data[keyword_data_id][0] = note;
				new_keyword_data[keyword_data_id][1] = new_datetime;
				
				chrome.storage.local.set({[keyword]: new_keyword_data}).then(() => {
					triggerNotificationMessage("編輯內容已儲存", 'ok');

					callback(true);
				});
			}catch(e){
				triggerNotificationMessage("無法編輯該筆記 錯誤:" + e.name, 'error');
				console.log(e)

				callback(false);
				return;
			}
		}
	});
}

function getDisplayKeyword(callback, try_time = 0){
	chrome.storage.local.get(["KeywordsDisplayCRF"]).then((result) => {
		let DisplayCRF = result.KeywordsDisplayCRF;
		let display_list = [];
		
		if (DisplayCRF == undefined){
			if (try_time < 3){
				setTimeout(() => {
					getDisplayKeyword(callback, try_time + 1);
				}, 1000);
			}
			else{
				callback([]);
			}
		}
		const display_list_length = Math.min((DisplayCRF.length - 1), Math.abs(DisplayCRF[DisplayCRF.length - 1][1]));
		for (let i = 0; i < display_list_length; i++){
			display_list.push(DisplayCRF[i][0]);
		}
		
		callback(display_list);
	});
}

function updateDisplayCRF(quest_keyword){
	if (!recorded_Keywords.includes(quest_keyword)){
		return;
	}
	
	chrome.storage.local.get(["KeywordsDisplayCRF"]).then((result) => {
		let DisplayCRF = result.KeywordsDisplayCRF;
		let is_includes = false;
		let less_index = -1;
		let less_CRF = -1;
		
		for (let i = 0; i < DisplayCRF.length - 1; i++){
			if (DisplayCRF[i][0] == quest_keyword){
				DisplayCRF[i][1] += 1;
				is_includes = true;
			}
			else{
				DisplayCRF[i][1] *= 0.9;
				if (less_CRF > DisplayCRF[i][1]){
					less_CRF = DisplayCRF[i][1];
					less_index = i;
				}
			}
		}
		
		if(!is_includes && (less_CRF < 1)){
			if ((DisplayCRF.length + DisplayCRF[DisplayCRF.length - 1] - 2) >= 0){
				DisplayCRF[less_index] = [quest_keyword, 1.0];
			}
			else{
				DisplayCRF.push([quest_keyword, 1.0]);
			}
		}
		
		DisplayCRF.sort((a, b) => {
		  return b[1] - a[1]
		});
		
		chrome.storage.local.set({KeywordsDisplayCRF: DisplayCRF}).then(() => {});
	});
}

function checkUrlIndex(host, callback){
	chrome.storage.local.get(['RecordedUrls']).then((result) => {
		callback(result.RecordedUrls.keys().includes(host));
	});
}

function addUrlIndex(host, is_special_url){
	if (is_special_url){
		let main = host.slice(0, host.indexOf(':'));
		let sub = host.slice(host.indexOf(':') + 1);
		
		chrome.storage.local.get(['RecordedUrls']).then((result) => {
			let new_recordedurls = result.RecordedUrls;
			
			if (!new_recordedurls[main]){
				new_recordedurls[main] = {main: false, sub: [sub]};
			}
			else{
				new_recordedurls[main].sub.push(sub);
			}
			
			chrome.storage.local.set({'RecordedUrls': new_recordedurls}).then((result) => {});
		});
	}
	else{
		chrome.storage.local.get(['RecordedUrls']).then((result) => {
			let new_recordedurls = result.RecordedUrls;
			
			if (!new_recordedurls[main]){
				new_recordedurls[main] = {main: true, sub: []};
			}
			else{
				new_recordedurls[main].main = true;
			}
			
			chrome.storage.local.set({'RecordedUrls': new_recordedurls}).then((result) => {});
		});
	}
}

function removeUrlIndex(host, is_special_url){
	if (is_special_url){
		let main = host.slice(0, host.indexOf(':'));
		let sub = host.slice(host.indexOf(':') + 1);
		
		chrome.storage.local.get(['RecordedUrls']).then((result) => {
			let new_recordedurls = result.RecordedUrls;
			
			if (new_recordedurls[main]){
				let remove_index = new_recordedurls[main].sub.indexOf(sub);
				
				if (remove_index >= 0){
					new_recordedurls[main].sub.splice(remove_index, 1);
					
					if (!new_recordedurls[main].main){
						delete new_recordedurls[main];
					}
					chrome.storage.local.set({'RecordedUrls': new_recordedurls}).then((result) => {});
				}
			}
		});
	}
	else{
		chrome.storage.local.get(['RecordedUrls']).then((result) => {
			let new_recordedurls = result.RecordedUrls;
			
			if (new_recordedurls[main]){
				new_recordedurls[main].main = false;
				
				if (len(new_recordedurls[main].sub) == 0){
					delete new_recordedurls[main];
				}
				chrome.storage.local.set({'RecordedUrls': new_recordedurls}).then((result) => {});
			}
		});
	}
}

// ====== 檔案存取 ====== 
function getInitTagFileData(callback){
	fetch("/data_file/init_tagdata.json")
	.then((response) => {
		return response.json();
	})
	.then((data) => {
		callback(data);
	});
}

// ====== 資料接收 ====== 
chrome.tabs.onActivated.addListener(function(info) {
	currentpage_TabId = info.tabId;
	console.log(`currentpage_TabId: ${currentpage_TabId}`);
	
	if (is_SidepanelON){
		const current_data = {currentpage_tabid: currentpage_TabId,
							  is_darkmode: setting['is_DarkMode']
							  };
		portWithSidepanel.postMessage(current_data);
	}
});

chrome.tabs.onUpdated.addListener(function(tabId) {
	if (is_SidepanelON && (tabId === currentpage_TabId)){
		waiting_RefreshPage = tabId;
	}
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse){
	switch (request.event_name) {
		//初始化
		case 'quest-current-tab-popup':
			sendResponse({});
			
			responseCurrentPageStatus((current_tab_info) => {
				
				const response_tab_message = {
					event_name: 'response-current-tab-popup',
					tab_id: currentpage_TabId,
					current_tab_info: current_tab_info
				};
				chrome.runtime.sendMessage(response_tab_message, (t) => {});
			});
			break;
		case 'quest-current-tab-sidepanel':
			sendResponse({});
			
			responseCurrentPageStatus((current_tab_info) => {
				
				const response_tab_message = {
					event_name: 'response-current-tab-sidepanel',
					current_tab_info: current_tab_info
				};
				chrome.runtime.sendMessage(response_tab_message, (t) => {});
			});
			break;
		case 'quest-extension-setting':
			responseSetting((setting) => {
				sendResponse(setting);
			});
			
			if (sender.tab && is_SidepanelON){
				if (sender.tab.id === waiting_RefreshPage){
					const current_data = {currentpage_tabid: currentpage_TabId,
						is_darkmode: setting['is_DarkMode']
						};
					portWithSidepanel.postMessage(current_data);
					
					waiting_RefreshPage = null;
				}
			}
			break;
		case 'quest-recorded-keywords':
			responseRecordedKeywords((recorded_keywords) => {
				sendResponse(recorded_keywords);
			});
			break;
			
		case 'quest-open-sidePanel':
			if (request.select_keyword != null){
				current_Keyword = request.select_keyword;
			}
			sendResponse({is_allow: !is_SidepanelON});
			
			/*
			if (!is_SidepanelON){
				chrome.sidePanel.open({tabId: currentpage_TabId});
			}
			*/
			
			break;
		case 'quest-sidePanel-on':
			responseSidepanelOn((response) => {
				sendResponse(response);
			});
			break;
		//訊息傳送
		case 'send-notification-message':
			sendResponse({});
			
			triggerNotificationMessage(request.message, request.notification_type);
			break;
		//索要資料
		case 'quest-url-notedata':
			sendResponse({});
			
			responseSidepanelUrlNoteData(request.host, (host_notedata, keywords_priority) => {
				const response_host_notedata = {
					event_name: 'response-url-notedata',
					host: request.host,
					host_notedata: host_notedata,
					keywords_priority: keywords_priority
				};
				chrome.runtime.sendMessage(response_host_notedata, (t) => {});
			});
			break;
		case 'quest-special-url-notedata':
			sendResponse({});
			
			responseSidepanelSpecialUrlNoteData(request.title, request.host, request.url, (title, key_index, host_notedata, keywords_priority) => {
				const response_host_notedata = {
					event_name: 'response-special-url-notedata',
					title: title,
					key_index: key_index,
					host_notedata: host_notedata,
					keywords_priority: keywords_priority
				};
				chrome.runtime.sendMessage(response_host_notedata, (t) => {});
			});
			break;
			
		case 'quest-keyword-notedata-sidepanel':
			sendResponse({});
			
			const quest_keyword_side = request.keyword;
			
			if (recorded_Keywords.includes(quest_keyword_side)){
				responseSidepanelKeywordsNoteData(quest_keyword_side, request.is_first, (keyword_notedata, keywords_priority) => {
					const response_keyword_notedata = {
						event_name: 'response-keyword-notedata-sidepanel',
						keyword: quest_keyword_side,
						keyword_notedata: keyword_notedata,
						keywords_priority: keywords_priority
					};
					
					if (is_SidepanelON){
						chrome.runtime.sendMessage(response_keyword_notedata, (t) => {});
						current_Keyword = quest_keyword_side;
					}
				});
			}
			
			break;
		case 'quest-keyword-notedata-content':
			sendResponse({});
			
			const quest_keyword_popup = request.keyword;
			responseContentKeywordsNoteData(quest_keyword_popup, (response_keyword_notedata) => {
				if (request.is_first){
					response_keyword_notedata.mouseX = request.mouseX;
					response_keyword_notedata.mouseY = request.mouseY;
				}
				else{
					response_keyword_notedata.index = request.index;
				}
				response_keyword_notedata.is_first = request.is_first;
				
				chrome.tabs.sendMessage(sender.tab.id, response_keyword_notedata, (t) => {});
			});
			break;
			
		case 'quest-display-keywords':
			sendResponse({});
			
			getDisplayKeyword((display_list) => {
				const response_display_keyword = {
					event_name: 'response-display-Keywords',
					display_keywords: display_list
				};
				
				chrome.runtime.sendMessage(response_display_keyword, (t) => {});
			});
			break;
		//修改儲存資料
		case 'send-keyword-note-add-popup':
			sendResponse({});
			
			addNewKeyword(request.keyword, "", (process_state, save_datetime) => {
				if (is_SidepanelON && process_state){
					responseSidepanelKeywordsNoteData(request.keyword, false, (keyword_notedata, keywords_priority) => {
						const response_keyword_notedata = {
							event_name: 'response-keyword-notedata-sidepanel',
							keyword: request.keyword,
							keyword_notedata: keyword_notedata,
							keywords_priority: keywords_priority
						};
						const send_keyword_add = {
							event_name: 'reload-recorded-Keywords'
						};
						
						chrome.runtime.sendMessage(response_keyword_notedata, (t) => {});
						chrome.runtime.sendMessage(send_keyword_add, (t) => {});
					});
				}
			});
			break;
			
		case 'send-keyword-note-add':
			sendResponse({});
			
			addNewKeyword(request.keyword, request.notecontent, (process_state, save_datetime) => {
				const response_keyword_process = {
					event_name: 'response-keyword-note-add',
					process_state: process_state,
					save_datetime: save_datetime
				};
				const send_keyword_add = {
					event_name: 'reload-recorded-Keywords'
				};
					
				chrome.runtime.sendMessage(response_keyword_process, (t) => {});
				chrome.runtime.sendMessage(send_keyword_add, (t) => {});
			});
			break;
		case 'send-url-note-add':
			sendResponse({});
			
			addNewUrl(request.host, request.notecontent, request.is_special_url, (process_state, save_datetime) => {
				const response_url_process = {
					event_name: 'response-url-note-add',
					process_state: process_state,
					save_datetime: save_datetime
				};
					
				chrome.runtime.sendMessage(response_url_process, (t) => {});
			});
			break;
		
		case 'send-keyword-note-delete':
			sendResponse({});
			
			deleteKeyword(request.keyword, (process_state) => {
				const response_keyword_process = {
					event_name: 'response-keyword-note-delete',
					process_state: process_state
				};
					
				chrome.runtime.sendMessage(response_keyword_process, (t) => {});
			});
			break;
		case 'send-url-note-delete':
			sendResponse({});
			
			deleteUrl(request.host, request.is_special_url, (process_state) => {
				const response_url_process = {
					event_name: 'response-url-note-delete',
					process_state: process_state
				};
					
				chrome.runtime.sendMessage(response_url_process, (t) => {});
			});
			break;
		//-------
		case 'send-keyword-notedata-add':
			sendResponse({});
			
			addKeywordNote(request.keyword, request.notecontent, (process_state, save_datetime) => {
				const response_keyword_process = {
					event_name: 'response-keyword-notedata-save',
					process_state: process_state,
					note_id: request.note_id,
					save_datetime: save_datetime
				};
					
				chrome.runtime.sendMessage(response_keyword_process, (t) => {});
			});
			break;
		case 'send-url-notedata-add':
			sendResponse({});
			
			addKeywordNote(request.host, request.notecontent, (process_state, save_datetime) => {
				const response_url_process = {
					event_name: 'response-url-notedata-save',
					process_state: process_state,
					note_id: request.note_id,
					save_datetime: save_datetime
				};
					
				chrome.runtime.sendMessage(response_url_process, (t) => {});
			});
			break;
			
		case 'send-keyword-notedata-save':
			sendResponse({});
			
			editKeywordNote(request.keyword, request.notecontent, request.note_id, (process_state, save_datetime) => {
				const response_keyword_process = {
					event_name: 'response-keyword-notedata-save',
					process_state: process_state,
					note_id: request.note_id,
					save_datetime: save_datetime
				};
					
				chrome.runtime.sendMessage(response_keyword_process, (t) => {});
			});
			break;
		case 'send-url-notedata-save':
			sendResponse({});
			
			editKeywordNote(request.host, request.notecontent, request.note_id, (process_state, save_datetime) => {
				const response_url_process = {
					event_name: 'response-url-notedata-save',
					process_state: process_state,
					note_id: request.note_id,
					save_datetime: save_datetime
				};
					
				chrome.runtime.sendMessage(response_url_process, (t) => {});
			});
			break;
			
		case 'send-keyword-notedata-delete':
			sendResponse({});
			
			deleteKeywordNote(request.keyword, request.note_id, (process_state) => {
				const response_keyword_process = {
					event_name: 'response-keyword-notedata-delete',
					process_state: process_state,
					note_id: request.note_id
				};
					
				chrome.runtime.sendMessage(response_keyword_process, (t) => {});
			});
			break;
		case 'send-url-notedata-delete':
			sendResponse({});
			
			deleteKeywordNote(request.host, request.note_id, (process_state) => {
				const response_url_process = {
					event_name: 'response-url-notedata-delete',
					process_state: process_state,
					note_id: request.note_id
				};
					
				chrome.runtime.sendMessage(response_url_process, (t) => {});
			});
			break;
		//-------
		case 'send-keyword-note-pin':
			sendResponse({});
			
			addNotePriority(request.keyword, request.note_id, (process_state) => {
				const response_keyword_process = {
					event_name: 'response-keyword-note-pin',
					process_state: process_state,
					note_id: request.note_id
				};
					
				chrome.runtime.sendMessage(response_keyword_process, (t) => {});
			});
			break;
		case 'send-url-note-pin':
			sendResponse({});
			
			addNotePriority(request.host, request.note_id, (process_state) => {
				const response_url_process = {
					event_name: 'response-url-note-pin',
					process_state: process_state,
					note_id: request.note_id
				};
					
				chrome.runtime.sendMessage(response_url_process, (t) => {});
			});
			break;
			
		case 'send-keyword-note-unpin':
			sendResponse({});
			
			removeNotePriority(request.keyword, request.note_id, (process_state) => {
				const response_keyword_process = {
					event_name: 'response-keyword-note-unpin',
					process_state: process_state,
					note_id: request.note_id
				};
					
				chrome.runtime.sendMessage(response_keyword_process, (t) => {});
			});
			break;
		case 'send-url-note-unpin':
			sendResponse({});
			
			removeNotePriority(request.host, request.note_id, (process_state) => {
				const response_url_process = {
					event_name: 'response-url-note-unpin',
					process_state: process_state,
					note_id: request.note_id
				};
					
				chrome.runtime.sendMessage(response_url_process, (t) => {});
			});
			break;
		//-------
		case 'update-setting-change':
			sendResponse({});
			
			settingInitialSetting(request.setting_name, request.value, (process_state) => {
				const response_setting_change = {
					event_name: 'response-setting-change',
					setting_name: request.setting_name,
					value: request.value,
					process_state: process_state
				};
					
				chrome.runtime.sendMessage(response_setting_change, (t) => {});
			});
			
		//頁面更新
		case 'special-url-page-updated':
			sendResponse({});
			
			if (is_SidepanelON && currentpage_TabId == sender.tab.id){
				const current_data = {currentpage_tabid: currentpage_TabId,
									  is_darkmode: setting['is_DarkMode']
									  };
				portWithSidepanel.postMessage(current_data);
			}
			break;
			
		case 'response-keyword-mark-search':
			if (request.request_from == 'hotkey'){
				sendResponse({});
			}
			chrome.action.setBadgeText({tabId: currentpage_TabId, text: `${request.process_keycount}`}, (t) => {});
			break;
			
	}
	console.log(request.event_name);
});

chrome.runtime.onConnect.addListener(function (port) {
	switch (port.name) {
		case 'Sidepanel':
			is_SidepanelON = true;
			
			portWithSidepanel = port;
			
			setTimeout(() => {
				const current_data = {currentpage_tabid: currentpage_TabId,
									  is_darkmode: setting['is_DarkMode']
									  };
				portWithSidepanel.postMessage(current_data);
			}, 500);
		
			port.onDisconnect.addListener(async () => {
				is_SidepanelON = false;
				portWithSidepanel = null;
			});
			break;
	}
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
	switch (info.menuItemId) {
		case 'KDN_keywordselect':
			if (keyword_reserved_words.includes(info.selectionText)){
				triggerNotificationMessage("這個關鍵字為系統保留字，無法新增", 'error');
			}
			else if (info.selectionText != ""){
				if (!is_SidepanelON){
					current_Keyword = info.selectionText;
					currentpage_TabId = tab.id;
					chrome.sidePanel.open({tabId: currentpage_TabId});
					
					addNewKeyword(info.selectionText, "", (process_state, save_datetime) => {});
				}
				else{
					addNewKeyword(info.selectionText, "", (process_state, save_datetime) => {
						if (process_state){
							current_Keyword = info.selectionText;
							
							responseSidepanelKeywordsNoteData(info.selectionText, false, (keyword_notedata, keywords_priority) => {
								const response_keyword_notedata = {
									event_name: 'response-keyword-notedata-sidepanel',
									keyword: info.selectionText,
									keyword_notedata: keyword_notedata,
									keywords_priority: keywords_priority
								};
								const send_keyword_add = {
									event_name: 'reload-recorded-Keywords'
								};
								
								chrome.runtime.sendMessage(response_keyword_notedata, (t) => {});
								chrome.runtime.sendMessage(send_keyword_add, (t) => {});
							});
						}
					});
				}
			}
			break;
	}
});

chrome.commands.onCommand.addListener((command) => {
	switch (command) {
		case 'KDN_SearchKeyword':
			const quest_tab_message = {
				event_name: 'quest-tab-status',
				tab_id: currentpage_TabId
			};
			
			function quest_contentaction(tabid){
				chrome.tabs.sendMessage(tabid, quest_tab_message, (response) => {
					if(chrome.runtime.lastError){
						triggerNotificationMessage("目前瀏覽網頁尚未初始化\n請重新載入", 'error');
					}
					else if (!response.is_areadysearch){
						chrome.tabs.sendMessage(tabid, {event_name: 'keyword-mark-search', from: 'hotkey'}, (t) => {});
					}
					else if(response.is_markhide){
						chrome.tabs.sendMessage(tabid, {event_name: 'keyword-mark-show', from: 'hotkey'}, (t) => {});
					}
					else{
						chrome.tabs.sendMessage(tabid, {event_name: 'keyword-mark-hide', from: 'hotkey'}, (t) => {});
					}
				});
			}
			if (currentpage_TabId == null){
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
				  currentpage_TabId = tabs[0].id;
				  quest_contentaction(currentpage_TabId);
				});
			}
			else{
				quest_contentaction(currentpage_TabId);
			}
			break;
			
		case 'KDN_Sidepanel':
			if (!is_SidepanelON){
				chrome.sidePanel.open({tabId: currentpage_TabId});
			}
	}
});

chrome.notifications.onButtonClicked.addListener(function(notificationId, btnIdx) {
    if (Boolean(confirmnotifications_Data[notificationId])) {
		switch (confirmnotifications_Data[notificationId].notification_type){
			case 'new_version':
				if (btnIdx == 0){
					chrome.tabs.create({ url: 'https://github.com/wantZzz/Keyword-Dictionary-Notes/releases/latest' });
				}
				else if(btnIdx == 1){
					const latest_version = confirmnotifications_Data[notificationId].latest_version;
					questInitialSetting('github_', (github_data) => {
						github_data['version'] = latest_version;
						settingInitialSetting('github_', github_data, () => {});
					});
					delete confirmnotifications_Data[notificationId];
				}
				break;
		}
    }
	/*else{
		triggerNotificationMessage("該操作似乎超過時間限制了\n請嘗試重新該操作", 'warning');
	}*/
});
// ====== 安裝時初始化 ====== 
chrome.runtime.onInstalled.addListener(function (details){
	if (details.reason == "install"){
		getInitTagFileData((initial_data) => {
			chrome.storage.local.set(initial_data).then(() => {});
		
			recorded_Keywords = ['標籤', '無標籤'];
			current_Keyword = '標籤';
			
			console.log('安裝初始化完成');
		})
	}
	else{
		questInitialSetting('is_DarkMode', (response) => {
			setting['is_DarkMode'] = response;
		});
		questInitialSetting('is_SwitchWithTab', (response) => {
			setting['is_SwitchWithTab'] = response;
		});
		
		questInitialSetting('note_version', (note_version) => {
			if (note_version != 2){
				switch (note_version) {
					case 0:
						const setting_github_init = {
							version: "v0.0.0-beta.3",
							notify_time: 100
						}
						
						settingInitialSetting('github_', setting_github_init, () => {});
						settingInitialSetting('note_version', 1, () => {});
					case 1:
						chrome.storage.local.set({"RecordedUrls": {}}).then(() => {});
						settingInitialSetting('note_version', 2, () => {});
				}
			}
			/*
			else if (note_version > 1){
			}
			*/
			
			
			console.log('擴充功能初始化完成');
		});
	}
	
	chrome.contextMenus.create({  
        id: 'KDN_keywordselect',
        type: 'normal',
        title: '建立以 "%s" 為索引的筆記',
        contexts: ['selection']
    });
});

// ====== 初始化 ====== 
chrome.runtime.onStartup.addListener(() => {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
	  currentpage_TabId = tabs[0].id;
	});
	
	questInitialSetting('is_DarkMode', (response) => {
		setting['is_DarkMode'] = response;
	});
	questInitialSetting('is_SwitchWithTab', (response) => {
		setting['is_SwitchWithTab'] = response;
	});

	checkForNewRelease();
	console.log('擴充功能初始化完成');
});

reloadKeywordlist((new_recorded_keywords) => {
	if ((current_Keyword == '') || (recorded_Keywords.length == 0)){
		recorded_Keywords = new_recorded_keywords;
		getDisplayKeyword((display_list) => {
			current_Keyword = display_list[0];
		});
	}
});
