import {newNoteGoogleDocs, remitNoteGoogleDocs} from "./modle/Remit2GoogleDocs.js";
import {isSubPageIndex, responseSidepanelSubPageIndexUrlNoteData} from "./modle/SubpageIndex.js";

//外部腳本資料
var currentpage_TabId = null;
var is_CurrentPageSearch = false;
var is_SidepanelON = false;
var waiting_RefreshPage = null;

var portWithSidepanel = null;
//通用設定資料
var setting = {
	is_DarkMode: true,
	is_SwitchWithTab: true,
	is_GoogleConnect: [false, ""]
}

var confirmnotifications_Data = {};//{confirm_notification_ids: {json_data}}
//儲存資料
const keyword_reserved_words = ['KeywordsNotePriority', 'RecordedKeywords', 'KeywordsSetting', 'AutoTriggerUrl', 'KeywordsDisplayCRF', 'RecordedUrls'];
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
					response.is_special_urls = isSubPageIndex(response.host);
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
			  is_googleconnect: setting['is_GoogleConnect'],
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
	if (isSubPageIndex(host)){
		responseSidepanelSubPageIndexUrlNoteData(title, host, url, responseUrlNoteData, getNotePriority, responseSidepanelUrlNoteData, callback)
	}
}

// ====== 訊息傳遞 ====== 
function triggerNotificationMessage(message, type){
	const options = {
	  type: "basic",
	  iconUrl: "./images/icon.png",
	  title: "",
	  message: message
	};
	
	switch (type) {
		case 'error':
			//alertContainer.style.backgroundColor = '#EA0000';
			options.title = chrome.i18n.getMessage('trigger_notification_message_error');
			break;

		case 'nofound':
			//alertContainer.style.backgroundColor = '#FFD306';
			options.title = chrome.i18n.getMessage('trigger_notification_message_nofound');
			break;
			
		case 'warning':
			//alertContainer.style.backgroundColor = '#FFD306';
			options.title = chrome.i18n.getMessage('trigger_notification_message_warning');
			break;

		case 'ok':
			//alertContainer.style.backgroundColor = '#00A600';
			options.title = chrome.i18n.getMessage('trigger_notification_message_ok');
			break;

		default:
			options.title = chrome.i18n.getMessage('trigger_notification_message_default');
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
	  title: "",
	  message: message
	};
	
	switch (type) {
		case 'new_version':
			options.title = chrome.i18n.getMessage('confirm_notification_message_newVersion');
			options.buttons = [{
				title: chrome.i18n.getMessage('confirm_notification_message_newVersion_0confirm')
			}, {
				title: chrome.i18n.getMessage('confirm_notification_message_newVersion_0cancel')
			}];
			break;
		default:
			options.title = chrome.i18n.getMessage('confirm_notification_message_default');
			options.buttons = [{
				title: chrome.i18n.getMessage('confirm_notification_message_default_0confirm')
			}, {
				title: chrome.i18n.getMessage('confirm_notification_message_default_0cancel')
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

function compareVersion(v1, v2){
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
		//triggerNotificationMessage("這個關鍵字為系統保留字，無法新增", 'error');
		triggerNotificationMessage(chrome.i18n.getMessage('add_new_keyword_reserved_error'), 'error');
		callback(false, null);
		return;
	}
	if(recorded_Keywords.includes(new_keyword)){
		//triggerNotificationMessage("該關鍵字已存在", 'error');
		triggerNotificationMessage(chrome.i18n.getMessage('add_new_keyword_exist_error'), 'error');
		callback(false, null);
		return;
	}

	chrome.storage.local.get([new_keyword]).then((result) => {
		if (result.hasOwnProperty(new_keyword)){
			//triggerNotificationMessage("該關鍵字已被占用或關鍵字為一段已記錄網址", 'error');
			triggerNotificationMessage(chrome.i18n.getMessage('add_new_keyword_exist_storage_error'), 'error');
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
				
				//triggerNotificationMessage("關鍵字索引已新增", 'ok');
				triggerNotificationMessage(chrome.i18n.getMessage('add_new_keyword_finish'), 'ok');
			});
		});
	});
}

function deleteKeyword(keyword, callback){
	if(keyword_reserved_words.includes(keyword)){
		//triggerNotificationMessage("這個關鍵字為系統保留字，無法移除", 'error');
		triggerNotificationMessage(chrome.i18n.getMessage('delete_new_keyword_reserved_error'), 'error');
		callback(false);
		return;
	}
	if(!recorded_Keywords.includes(keyword)){
		//triggerNotificationMessage("該關鍵字不存在", 'error');
		triggerNotificationMessage(chrome.i18n.getMessage('delete_keyword_notexist_error'), 'error');
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
			
			//triggerNotificationMessage("關鍵字索引已刪除", 'ok');
			triggerNotificationMessage(chrome.i18n.getMessage('delete_new_keyword_finish'), 'ok');
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
		//triggerNotificationMessage("該網址已被某個關鍵字占用", 'error');
		triggerNotificationMessage(chrome.i18n.getMessage('add_new_url_exist_error'), 'error');
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
		
		//triggerNotificationMessage("網址索引已新增", 'ok');
		triggerNotificationMessage(chrome.i18n.getMessage('add_new_url_finish'), 'ok');
	});
	
	addUrlIndex(new_host, is_special_url);
}

function deleteUrl(host, is_special_url, callback){
	chrome.storage.local.remove([host]).then(() => {
		callback(true);
		
		//triggerNotificationMessage("網址索引已刪除", 'ok');
		triggerNotificationMessage(chrome.i18n.getMessage('delete_new_url_finish'), 'ok');
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
		//triggerNotificationMessage("這個關鍵字為系統保留字，無法該進行操作", 'error');
		triggerNotificationMessage(chrome.i18n.getMessage('edit_keyword_reserved_error'), 'error');
		callback(false);
		return;
	}
	if(recorded_Keywords.includes(new_keyword)){
		//triggerNotificationMessage("該關鍵字已存在", 'error');
		triggerNotificationMessage(chrome.i18n.getMessage('edit_keyword_exist_error'), 'error');
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
					
					//triggerNotificationMessage("關鍵字修改成功", 'ok');
					triggerNotificationMessage(chrome.i18n.getMessage('edit_keyword_finish'), 'ok');
				});
			});
		});
	});
}

function addKeywordNote(keyword, note, callback){
	chrome.storage.local.get([keyword]).then((result) => {
		if(!result.hasOwnProperty(keyword)){
			//triggerNotificationMessage("無法儲存該筆記 錯誤: keyword does not exist", 'error');
			triggerNotificationMessage(chrome.i18n.getMessage('add_keyword_note_noexist_error'), 'error');
			callback(false, null);
			return;
		}
		else{
			try{
				const new_datetime = datetimeOutputFormat();
				let new_keyword_data = result[keyword];

				new_keyword_data.push([note, new_datetime, false]);
				
				chrome.storage.local.set({[keyword]: new_keyword_data}).then(() => {
					//triggerNotificationMessage("筆記內容已儲存", 'ok');
					triggerNotificationMessage(chrome.i18n.getMessage('add_keyword_note_finish'), 'ok');

					callback(true, new_datetime);
				});
			}catch(e){
				//triggerNotificationMessage("無法儲存該筆記 錯誤:" + e.name, 'error');
				triggerNotificationMessage(chrome.i18n.getMessage('add_keyword_note_execute_error') + e.name, 'error');
				console.log(e)

				callback(false, null);
				return;
			}
		}
	})
	.catch((error) => {
		//triggerNotificationMessage("無法儲存該筆記 錯誤:" + error.name, 'error');
		triggerNotificationMessage(chrome.i18n.getMessage('add_keyword_note_execute_error') + e.name, 'error');
		console.log(error)

		callback(false, null);
		return;
	});
}

function deleteKeywordNote(keyword, keyword_data_id, callback){
	chrome.storage.local.get([keyword]).then((result) => {
		if(!result.hasOwnProperty(keyword)){
			//triggerNotificationMessage("無法刪除該筆記 錯誤: keyword does not exist", 'error');
			triggerNotificationMessage(chrome.i18n.getMessage('add_keyword_note_execute_error'), 'error');
			callback(false);
			return;
		}
		else{
			try{
				let new_keyword_data = result[keyword];
				
				new_keyword_data.splice(keyword_data_id, 1);
				chrome.storage.local.set({[keyword]: new_keyword_data}).then(() => {
					//triggerNotificationMessage("筆記已刪除", 'ok');
					triggerNotificationMessage(chrome.i18n.getMessage('delete_keyword_note_finish'), 'ok');

					callback(true);
				});
			}catch(e){
				//triggerNotificationMessage("無法刪除該筆記 錯誤:" + e.name, 'error');
				triggerNotificationMessage(chrome.i18n.getMessage('delete_keyword_note_execute_error') + e.name, 'error');
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
			//triggerNotificationMessage("無法編輯該筆記 錯誤: keyword does not exist", 'error');
			triggerNotificationMessage(chrome.i18n.getMessage('delete_keyword_note_execute_error'), 'error');
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
					//triggerNotificationMessage("編輯內容已儲存", 'ok');
					triggerNotificationMessage(chrome.i18n.getMessage('edit_keyword_note_finish'), 'ok');

					callback(true);
				});
			}catch(e){
				//triggerNotificationMessage("無法編輯該筆記 錯誤:" + e.name, 'error');
				triggerNotificationMessage(chrome.i18n.getMessage('edit_keyword_note_execute_error') + e.name, 'error');
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

//function getNodeBackgroundColor(input_node)

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

function exportBackupData(callback){
	let note_indexs = [];
	let backup_output = {};
	
	function exporturl_index(Recorded_url_indexs){
		const Recorded_host_indexs = Object.keys(Recorded_url_indexs)
		for (var i = 0; i < Recorded_host_indexs.length; i++){
			const host_data = Recorded_url_indexs[Recorded_host_indexs[i]]
			
			if (host_data.main){
				note_indexs.push(Recorded_host_indexs[i])
			}
			
			for (var j = 0; j < host_data.sub.length; j++){
				note_indexs.push((Recorded_keyword_indexs[i] + ':' + host_data.sub[j]))
			}
		}
	}
	
	reloadKeywordlist((new_recorded_keywords) => {
		note_indexs = new_recorded_keywords;
		
		chrome.storage.local.get(["RecordedUrls"]).then((result) => {
			exporturl_index(result.RecordedUrls);
			
			chrome.storage.local.get(keyword_reserved_words).then((result) => {
				backup_output = result;
				
				chrome.storage.local.get(note_indexs).then((result) => {
					backup_output['note_datas'] = result;
					callback(backup_output);
				});
			});
		});
	});
}

function inportBackupJsonData(import_data, is_overwrite){
	function exporturl_index(Recorded_url_indexs){
		let note_indexs = [];
		const Recorded_host_indexs = Object.keys(Recorded_url_indexs)
		for (var i = 0; i < Recorded_host_indexs.length; i++){
			const host_data = Recorded_url_indexs[Recorded_host_indexs[i]]
			
			if (host_data.main){
				note_indexs.push(Recorded_host_indexs[i])
			}
			
			for (var j = 0; j < host_data.sub.length; j++){
				note_indexs.push((Recorded_keyword_indexs[i] + ':' + host_data.sub[j]))
			}
		}
		
		return note_indexs;
	}

	chrome.storage.local.get(["KeywordsSetting"]).then((result) => {
		const update_keywords_settings = Object.keys(import_data["KeywordsSetting"]);
		const keywords_settings = result.KeywordsSetting;
		
		for (var i = 0; i < update_keywords_settings.length; i++){
			keywords_settings[update_keywords_settings[i]] = import_data["KeywordsSetting"][update_keywords_settings[i]];
		}
		
		if (is_overwrite){
			const control_data = {
				"RecordedKeywords": import_data.RecordedKeywords,
				"RecordedUrls": import_data.RecordedUrls,
				"AutoTriggerUrl": import_data.AutoTriggerUrl,
				"KeywordsDisplayCRF": import_data.KeywordsDisplayCRF,
				"KeywordsNotePriority": import_data.KeywordsNotePriority,
				"KeywordsSetting": keywords_settings
			}
			
			chrome.storage.local.get(["RecordedUrls"]).then((result) => {
				const remove_url_indexs = exporturl_index(result.RecordedUrls);
				const remove_indexs = remove_url_indexs.concat(recorded_Keywords);
				
				chrome.storage.local.remove(remove_indexs).then(() => {
					chrome.storage.local.set(control_data).then(() => {
						chrome.storage.local.set(import_data['note_datas']).then(() => {
							recorded_Keywords = control_data.RecordedKeywords;
							current_Keyword = control_data.RecordedKeywords.includes(current_Keyword) ? current_Keyword : import_data.RecordedKeywords[0];
							
							triggerNotificationMessage(chrome.i18n.getMessage('inport_backupdata_finish'), 'ok');
							if (Boolean(portWithSidepanel)){
								responseSidepanelKeywordsNoteData(current_Keyword, true, (keyword_notedata, keywords_priority) => {
									const response_keyword_notedata = {
										event_name: 'response-keyword-notedata-sidepanel',
										keyword: current_Keyword,
										keyword_notedata: keyword_notedata,
										keywords_priority: keywords_priority
									};
									
									if (is_SidepanelON){
										chrome.runtime.sendMessage(response_keyword_notedata, (t) => {});
									}
									chrome.runtime.sendMessage({event_name: 'reload-recorded-Keywords'}, (t) => {});
								});
							}
						});
					});
				});
			});
		}
		else{
			let add_indexs = [];
			let update_indexs = [];
			
			chrome.storage.local.get(keyword_reserved_words).then((reserved_result) => {
				for (var i = 0; i < import_data['RecordedKeywords'].length; i++){
					if (!reserved_result.RecordedKeywords.includes(import_data['RecordedKeywords'][i])){
						add_indexs.push(import_data['RecordedKeywords'][i]);
					}
					else{
						update_indexs.push(import_data['RecordedKeywords'][i]);
					}
				}
				
				const keyword_add_indexs = add_indexs;

				let update_url_indexs = reserved_result.RecordedUrls;
				const import_url_indexs = Object.keys(import_data['RecordedUrls']);
				for (var i = 0; i < import_url_indexs.length; i++){
					const recorded_host_data = update_url_indexs[import_url_indexs[i]];
					const import_host_data = import_data['RecordedUrls'][import_url_indexs[i]];
					
					if (!Boolean(recorded_host_data)){
						if (import_host_data.main){
							add_indexs.push(import_url_indexs[i]);
						}
						
						for (var j = 0; j < import_host_data.sub.length; j++){
							add_indexs.push((import_url_indexs[i] + ':' + import_host_data.sub[j]))
						}
						
						update_url_indexs[import_url_indexs[i]] = import_host_data;
					}
					else{
						if (import_host_data.main){
							if (recorded_host_data.main){
								update_indexs.push(import_url_indexs[i]);
							}
							else{
								add_indexs.push(import_url_indexs[i]);
							}
							update_url_indexs[import_url_indexs[i]].main = true;
						}
						
						for (var j = 0; j < import_host_data.sub.length; j++){
							if (recorded_host_data.sub.includes(import_host_data.sub[j])){
								update_indexs.push((import_url_indexs[i] + ':' + import_host_data.sub[j]));
							}
							else{
								add_indexs.push((import_url_indexs[i] + ':' + import_host_data.sub[j]));
							}
							update_url_indexs[import_url_indexs[i]].sub.push(import_host_data.sub[j]);
						}
					}
				}
				
				const note_priority_indexs = Object.keys(import_data['KeywordsNotePriority']);
				const update_note_priority = reserved_result.KeywordsNotePriority;
				for (var i = 0; i < note_priority_indexs.length; i++){
					const recored_note_priority = update_note_priority[note_priority_indexs[i]];
					const add_note_priority = import_data['KeywordsNotePriority'][note_priority_indexs[i]]
					
					update_note_priority[note_priority_indexs[i]] = Boolean(recored_note_priority) ? recored_note_priority.concat(add_note_priority) : add_note_priority;
				}
				
				chrome.storage.local.get(update_indexs).then((update_notedatas) => {
					for (var i = 0; i < update_indexs.length; i++){
						const add_notes = import_data['note_datas'][update_indexs[i]];
						
						update_notedatas[update_indexs[i]] = update_notedatas[update_indexs[i]].concat((Boolean(add_notes) ? add_notes : []));
					}
					
					for (var i = 0; i < add_indexs.length; i++){
						update_notedatas[add_indexs[i]] = import_data['note_datas'][add_indexs[i]];
					}
					
					const control_data = {
						"RecordedKeywords": reserved_result.RecordedKeywords.concat(keyword_add_indexs),
						"RecordedUrls": update_url_indexs,
						"AutoTriggerUrl": reserved_result.AutoTriggerUrl,
						"KeywordsDisplayCRF": reserved_result.KeywordsDisplayCRF,
						"KeywordsNotePriority": update_note_priority,
						"KeywordsSetting": keywords_settings
					}
					
					chrome.storage.local.set(control_data).then(() => {
						chrome.storage.local.set(update_notedatas).then(() => {
							recorded_Keywords = control_data.RecordedKeywords;
							current_Keyword = control_data.RecordedKeywords.includes(current_Keyword) ? current_Keyword : import_data.RecordedKeywords[0];
							
							triggerNotificationMessage(chrome.i18n.getMessage('inport_backupdata_finish'), 'ok');
							if (Boolean(portWithSidepanel)){
								responseSidepanelKeywordsNoteData(current_Keyword, true, (keyword_notedata, keywords_priority) => {
									const response_keyword_notedata = {
										event_name: 'response-keyword-notedata-sidepanel',
										keyword: current_Keyword,
										keyword_notedata: keyword_notedata,
										keywords_priority: keywords_priority
									};
									
									if (is_SidepanelON){
										chrome.runtime.sendMessage(response_keyword_notedata, (t) => {});
									}
									chrome.runtime.sendMessage({event_name: 'reload-recorded-Keywords'}, (t) => {});
								});
							}
						});
					});
				});
			});
		}
	});
}

// ====== 網路功能 ======
function checkGoogleAccount(callback){
	chrome.identity.getProfileUserInfo({accountStatus: 'ANY'}, (result) => {
		callback(result);
	})
}

function connectGoogleAccount(callback){
	chrome.identity.getAuthToken({'interactive': true}, (result) => {
		if(chrome.runtime.lastError){
			setting['is_GoogleConnect'] = [false, ""];
			callback(false);
		}
		else{
			checkGoogleAccount((account_info) => {
				setting['is_GoogleConnect'] = [true, account_info.email];
				callback(true);
			});
		}
	});
}

function disconnectGoogleAccount(callback){
	chrome.identity.clearAllCachedAuthTokens((result) => {
		setting['is_GoogleConnect'] = [false, ""];
		callback(true);
	})
}

function getGoogleAccountToken(callback){
	chrome.identity.getAuthToken({'interactive': false}, (result) => {
		if(chrome.runtime.lastError){
			setting['is_GoogleConnect'] = [false, ""];
			callback("", false);
		}
		else{
			checkGoogleAccount((account_info) => {
				setting['is_GoogleConnect'] = [true, account_info.email];
			});
			callback(result, true);;
		}
	})
}

//function newNoteGoogleDocs(title, token, callback)
//function remitNoteGoogleDocs(token, callback)

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
		case 'send-keyword-note-add-popup'://預計廢棄
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
		case 'webapp-url-page-updated':
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
			
		//帳戶連接
		case 'check-account-google':
			sendResponse({});
			checkGoogleAccount((account_info) => {
				const response_check_account = {
					event_name: 'response-check-account-google',
					account_info: account_info
				};
					
				chrome.runtime.sendMessage(response_check_account, (t) => {});
			});
			break;
			
		case 'connect-account-google':
			sendResponse({});
			connectGoogleAccount((process_state) => {
				const response_connect_account = {
					event_name: 'response-connect-account-google',
					process_state: process_state
				};
					
				chrome.runtime.sendMessage(response_connect_account, (t) => {});
			});
			break;
		case 'disconnect-account-google':
			sendResponse({});
			disconnectGoogleAccount((process_state) => {
				const response_disconnect_account = {
					event_name: 'response-disconnect-account-google',
					process_state: process_state
				};
					
				chrome.runtime.sendMessage(response_disconnect_account, (t) => {});
			});
			break;
			
		//備份資料
		case 'quest-backupdata-export':
			sendResponse({});
			exportBackupData((backup_output) => {
				const response_backupdata_export = {
					event_name: 'response-backupdata-export',
					backup_data: backup_output
				};
					
				chrome.runtime.sendMessage(response_backupdata_export, (t) => {});
			});
			break;
		case 'quest-backupdata-inport':
			sendResponse({});
			inportBackupJsonData(request.json_data, request.is_overwrite);
			break;
			
		case 'create-backup-docs-google':
			sendResponse({});
			getKeywordData(request.tag_name, (result, is_exist) => {
				if (is_exist){
					if (setting['is_GoogleConnect'][0]){
						chrome.runtime.sendMessage({event_name: 'format-note2googledocs', tag_name: request.tag_name, note_data: result}, () => {});
					}
					else{
						triggerNotificationMessage(chrome.i18n.getMessage('backup_docs_google_unlogin_error'), 'warning');
					}
				}
				else{
					triggerNotificationMessage(chrome.i18n.getMessage('backup_docs_google_notexist_error'), 'error');
				}
			});
			break;
		case 'response-format-note2googledocs':
			sendResponse({});

			getGoogleAccountToken((token, process_state) => {
				if (process_state){
					remitNoteGoogleDocs(request.tag_name, request.output_requests, request.output_await_requests, request.process_state, token, () => {});
				}
				else{
					triggerNotificationMessage(chrome.i18n.getMessage('backup_docs_google_cantgettoken_error'), 'error');
				}
			});
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
				//triggerNotificationMessage("這個關鍵字為系統保留字，無法新增", 'error');
				triggerNotificationMessage(chrome.i18n.getMessage('add_new_keyword_reserved_error'), 'error');
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
						//triggerNotificationMessage("目前瀏覽網頁尚未初始化\n請重新載入", 'error');
						triggerNotificationMessage(chrome.i18n.getMessage('web_page_notinit_error'), 'error');
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
				if (currentpage_TabId == null){
					chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
						currentpage_TabId = tabs[0].id;
						chrome.sidePanel.open({tabId: currentpage_TabId});
					});
				}
				else{
					chrome.sidePanel.open({tabId: currentpage_TabId});
				}
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
		settingInitialSetting('extension_version', 'v0.1.0-beta.0', () => {});
		
		questInitialSetting('note_version', (note_version) => {
			if (note_version != 2){
				switch (note_version) {
					case 0:
						const setting_github_init = {
							version: "v0.1.0-beta.0",
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
	
	chrome.identity.getAuthToken({'interactive': false}, (result) => {
		if(chrome.runtime.lastError){
			setting['is_GoogleConnect'] = [false, ""];
		}
		else{
			setTimeout(() => {
				triggerNotificationMessage(chrome.i18n.getMessage('check_can_connect_google'), 'ok');
				checkGoogleAccount((account_info) => {
					setting['is_GoogleConnect'] = [true, account_info.email];
				});
			}, 2000);
		}
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
