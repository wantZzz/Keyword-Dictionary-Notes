//外部腳本資料
var currentpage_TabId = null;
var is_CurrentPageSearch = false;
var is_SidepanelON = false;
var waiting_RefreshPage = null;

var portWithSidepanel = null;
//通用設定資料
var is_DarkMode = true;
var is_SwitchWithTab = true;
//儲存資料
const keyword_reserved_words = ['KeywordsNotePriority', 'RecordedKeywords', 'KeywordsSetting', 'AutoTriggerUrl', 'KeywordsDisplayCRF', 'max_KeywordDisplay'];
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
				if(response === undefined){
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
					const current_tab_info = {
						page_status: response,
						is_support: true,
						is_script_run: true
					};
					
					is_CurrentPageSearch = response.is_areadysearch;
					callback(current_tab_info);
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
	callback({is_darkmode: is_DarkMode,
			  is_switchwithtab: is_SwitchWithTab,
			  current_Keyword: current_Keyword
			  });
}

function responseSidepanelOn(callback){
	callback({is_sidepanelon: is_SidepanelON});
}

function responseRecordedKeywords(callback){
	let recorded_Keywords_response = {};
	
	recorded_Keywords.forEach(function (Keyword) {
		recorded_Keywords_response[Keyword] = 0;
	});
	
	callback({recorded_keywords: recorded_Keywords_response});
}

function responseKeywordsNoteData(keyword, callback){
	getKeywordData(keyword, (result, is_exist) => {
		if (is_exist){
			callback(result);
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

function responseSidepanelKeywordsNoteData(keyword, callback){
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
		}
	});
}

function responseSidepanelUrlNoteData(keyword, callback){
	responseUrlNoteData(keyword, (keyword_notedata) => {
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
		}
	});
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

// ====== 資料處理 ====== 
function datetimeOutputFormat(){
	var currentdate = new Date();
	var datetime = currentdate.getFullYear() + "/"
	+ (currentdate.getMonth()+1).toString().padStart(2,'0') + "/"
	+ currentdate.getDate().toString().padStart(2,'0') + " "
	+ currentdate.getHours().toString().padStart(2,'0') + ":"
	+ currentdate.getMinutes().toString().padStart(2,'0') + ":"
	+ currentdate.getSeconds().toString().padStart(2,'0');

	return datetime
}

function reloadKeywordlist(callback){
	chrome.storage.local.get(['RecordedKeywords']).then((result) => {
		callback(result.RecordedKeywords);
	});
}
	
function getKeywordData(keyword, callback){
	chrome.storage.local.get([keyword]).then((result) => {
		if(result.hasOwnProperty(keyword)){
			callback(result[keyword], true);
			updateDisplayCRF(keyword);
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
			var new_autotriggerurl = result.AutoTriggerUrl;
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
			var new_autotriggerurl = result.AutoTriggerUrl;
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

function questInitialSetting(setting_name, callback){
	chrome.storage.local.get(["KeywordsSetting"]).then((result) => {
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
		var new_keywordssetting = result.KeywordsSetting;
		new_keywordssetting[setting_name] = value;
			
		chrome.storage.local.set({KeywordsSetting: new_keywordssetting}).then(() => {
			callback(true);
		});
	});
}

function addNewKeyword(new_keyword, note, callback){
	if(keyword_reserved_words.indexOf(new_keyword) >= 0){
		triggerNotificationMessage("這個關鍵字為系統保留字，無法新增", 'error');
		callback(false, null);
		return;
	}
	if(recorded_Keywords.indexOf(new_keyword) >= 0){
		triggerNotificationMessage("該關鍵字已存在", 'error');
		callback(false, null);
		return;
	}

	var recorded_Keywords_copy = recorded_Keywords;
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
}

function deleteKeyword(keyword, callback){
	if(keyword_reserved_words.indexOf(keyword) >= 0){
		triggerNotificationMessage("這個關鍵字為系統保留字，無法移除", 'error');
		callback(false);
		return;
	}
	if(recorded_Keywords.indexOf(keyword) < 0){
		triggerNotificationMessage("該關鍵字不存在", 'error');
		callback(false);
		return;
	}

	var recorded_Keywords_copy = recorded_Keywords;
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
}

function addNewUrl(new_host, note, callback){
	let data = [];
	let new_datetime = null;
	
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
}

function deleteUrl(host, callback){
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
}

function editKeyword(new_keyword, old_keyword, callback){
	if(keyword_reserved_words.indexOf(new_keyword) >= 0){
		triggerNotificationMessage("這個關鍵字為系統保留字，無法新增", 'error');
		callback(false);
		return;
	}
	if(recorded_Keywords.indexOf(new_keyword) >= 0){
		triggerNotificationMessage("該關鍵字已存在", 'error');
		callback(false);
		return;
	}
	
	var recorded_Keywords_copy = recorded_Keywords;
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
				var new_keyword_data = result[keyword];

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
				var new_keyword_data = result[keyword];
				
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
				var new_keyword_data = result[keyword];

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

function getDisplayKeyword(callback){
	chrome.storage.local.get(["KeywordsDisplayCRF"]).then((result) => {
		let DisplayCRF = result.KeywordsDisplayCRF;
		let display_list = [];
		
		for (let i = 0; i < DisplayCRF.length - 1; i++){
			display_list.push(DisplayCRF[i][0]);
		}
		
		callback(display_list);
	});
}

function updateDisplayCRF(quest_keyword){
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

// ====== 資料接收 ====== 
chrome.tabs.onActivated.addListener(function(info) {
	currentpage_TabId = info.tabId;
	console.log(`currentpage_TabId: ${currentpage_TabId}`);
	
	if (is_SidepanelON){
		const current_data = {currentpage_tabid: currentpage_TabId,
							  is_darkmode: is_DarkMode
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
		case 'quest-initialization-data':
			sendResponse({});
			
			responseInitializationData(request.domain_name, (initialization_data) => {
				
				const response_tab_message = {
					event_name: 'response-initialization-data',
					initialization_data: initialization_data
				};
				chrome.tabs.sendMessage(currentpage_TabId, response_tab_message, (t) => {});
			});
			break;
		case 'quest-extension-setting':
			responseSetting((setting) => {
				sendResponse(setting);
			});
			
			if (sender.tab && is_SidepanelON){
				if (sender.tab.id === waiting_RefreshPage){
					const current_data = {currentpage_tabid: currentpage_TabId,
						is_darkmode: is_DarkMode
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
			sendResponse({});
		
			if (request.select_keyword != null){
				current_Keyword = request.select_keyword;
			}
			if (!is_SidepanelON){
				chrome.sidePanel.open({tabId: currentpage_TabId});
			}
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
		case 'quest-keyword-notedata-sidepanel':
			sendResponse({});
			
			const quest_keyword_side = request.keyword
			responseSidepanelKeywordsNoteData(quest_keyword_side, (keyword_notedata, keywords_priority) => {
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
				
				chrome.tabs.sendMessage(currentpage_TabId, response_keyword_notedata, (t) => {});
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
					responseSidepanelKeywordsNoteData(request.keyword, (keyword_notedata, keywords_priority) => {
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
			
			addNewUrl(request.host, request.notecontent, (process_state, save_datetime) => {
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
			
			deleteUrl(request.host, (process_state) => {
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
									  is_darkmode: is_DarkMode
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
			if (info.selectionText != ""){
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
							
							responseSidepanelKeywordsNoteData(info.selectionText, (keyword_notedata, keywords_priority) => {
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

// ====== 安裝時初始化 ====== 
chrome.runtime.onInstalled.addListener(function (details){
	if (details.reason == "install"){
		const initial_data = {
			RecordedKeywords: ['標籤', '無標籤'],
			AutoTriggerUrl: [],
			KeywordsDisplayCRF: [['標籤', 1.0], ['無標籤', 1.0], ['max_KeywordDisplay', -10.0]],
			KeywordsNotePriority: {'標籤': [1]},
			KeywordsSetting: {
				is_DarkMode: true,
				is_SwitchWithTab: true,
				note_version: 0
			},
			標籤: [
				[
					"<p>这是一个圆角矩形。&nbsp;<br>它的高度会随着文本内容而变化，但上下边距保持8px。</p>",
					"2024/03/12 16:50:03",
					false
				],
				[
					"我好想睡覺，我的夢想是攀登枕頭山山峰",
					"2023/09/09 10:20:36",
					true
				],
				[
					"早安",
					"2023/09/01 14:03:23",
					false
				],
				[
					"<p><i>新資料 </i><strong>輸入測試</strong></p><p>&nbsp;</p><ol><li><strong>項目一ejenfnefnef</strong></li><li><strong>項目二</strong></li><li><strong>項目三</strong></li></ol>",
					"2024/01/13 20:54:16",
					false
				]
			],
			無標籤: []
		}
		
		chrome.storage.local.set(initial_data).then(() => {});
		
		recorded_Keywords = ['標籤', '無標籤'];
		current_Keyword = '標籤';
		
		console.log('安裝初始化完成');
	}
	else{
		
		questInitialSetting('is_DarkMode', (response) => {
			is_DarkMode = response;
		});
		questInitialSetting('is_SwitchWithTab', (response) => {
			is_SwitchWithTab = response;
		});

		console.log('擴充功能初始化完成');
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
		is_DarkMode = response;
	});
	questInitialSetting('is_SwitchWithTab', (response) => {
		is_SwitchWithTab = response;
	});

	console.log('擴充功能初始化完成');
});

reloadKeywordlist((new_recorded_keywords) => {
	recorded_Keywords = new_recorded_keywords;
	current_Keyword = new_recorded_keywords[0];
});
