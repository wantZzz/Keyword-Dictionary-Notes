// ====== 背景處理資訊 ====== 
const KEYWORD_RESERVED_WORDS = ['KeywordKeyIndex', 'KeywordNoteData', 'UrlKeyIndex', 'UrlNoteData', 'KeywordDisplayOrder', 'KeywordsSetting', 'ModuleData'];
var confirm_NotificationsData = {};
var basic_StartupDataConfirmation = 'unload';

var keyword_KeyIndex = [];
var url_KeyIndex = [];

var background_Info = {
	currentKeyword: ""
}

// ====== 其他頁面資訊 ====== 
var current_PageInfo = {
	url: "",
	indexKey: "",
	title: "",
	tabId: null,
	isComplete: false,
	isSupport: false,
	isScriptRun: false,
	isSearched: false,
	keywordFound: {},
	isMarkhide: false,
	module: {}
}
var current_SidepageInfo = {
	isVisible: false,
	connectPort: null,
	identificationToken: "",
	keywordShow: {
		title: "",
		indexKey: "",
		module: {}
	},
	urlShow: {
		title: "",
		indexKey: "",
		module: {}
	}
}
var current_PopupInfo = {
	isVisible: false,
	connectPort: null
}

// ====== 通知訊息處理 ====== 
function createNotificationMessage(message, type){
	const Options = {
	  type: "basic",
	  iconUrl: "./images/icon.png",
	  title: "",
	  message: message
	};
	
	switch (type) {
		case 'error':
			Options.title = chrome.i18n.getMessage('notification_message_error_title');
			break;

		case 'nofound':
			Options.title = chrome.i18n.getMessage('notification_message_nofound_title');
			break;
			
		case 'warning':
			Options.title = chrome.i18n.getMessage('notification_message_warning_title');
			break;

		case 'ok':
			Options.title = chrome.i18n.getMessage('notification_message_ok_title');
			break;

		default:
			Options.title = chrome.i18n.getMessage('notification_message_default_title');
	}
	
	chrome.notifications.create(Options, (notificationId) => {
		setTimeout(() => {
			chrome.notifications.clear(notificationId, (wasCleared) => {});
		}, 5000);
	});
}

function createConfirmNotificationMessage(message, type, sendData){
	const Options = {
	  type: "basic",
	  iconUrl: "../images/icon.png",
	  title: "",
	  message: message
	};
	
	switch (type) {
		case 'delete':
			Options.title = chrome.i18n.getMessage('confirm_notification_message_delete');
			Options.buttons = [{
				title: chrome.i18n.getMessage('confirm_notification_message_delete_0confirm')
			}, {
				title: chrome.i18n.getMessage('confirm_notification_message_delete_0cancel')
			}];
			break;
		case 'new_version':
			Options.title = chrome.i18n.getMessage('confirm_notification_message_newVersion_title');
			Options.buttons = [{
				title: chrome.i18n.getMessage('confirm_notification_message_newVersion_confirm')
			}, {
				title: chrome.i18n.getMessage('confirm_notification_message_newVersion_cancel')
			}];
			break;
		default:
			Options.title = chrome.i18n.getMessage('confirm_notification_message_default_title');
			Options.buttons = [{
				title: chrome.i18n.getMessage('confirm_notification_message_default_confirm')
			}, {
				title: chrome.i18n.getMessage('confirm_notification_message_default_cancel')
			}];
	}
	
	chrome.notifications.create(Options, function(notificationId) {
		confirm_NotificationsData[notificationId] = sendData;
		
		setTimeout(() => {
			if (Boolean(confirm_NotificationsData[notificationId])) {
				delete confirm_NotificationsData[notificationId];
				
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
			const ApiURL = 'https://api.github.com/repos/wantZzz/Keyword-Dictionary-Notes/releases/latest';
				
			fetch(ApiURL)
			.then(response => response.json())
			.then(data => {
				const LatestVersion = data.tag_name;
				
				console.log(LatestVersion);
				console.log(github_data['version']);
				
				if (github_data['version'] != LatestVersion){
					const Consequences = compareVersion(LatestVersion, github_data['version']);
					
					//console.log(consequences);
					if (Consequences > 0){
						const SendUrlNoteDelete = {
							notification_type: 'new_version',
							latest_version: LatestVersion
						};

						confirmNotificationMessage(`新版本 ${LatestVersion} 已經釋出\n你可以選擇是否前往更新`, 'new_version', SendUrlNoteDelete);
						
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
	const ParseVersion = (version) => {
		if (version.startsWith('v')){
			version = version.slice(1);
		}
		
		const [VersionSuffix, Version_BetaOrAlpha] = version.split('-');
		
		const [Major, Minor, Patch] = VersionSuffix.split('.').map(Number);
		return { Major, Minor, Patch };
	};
	
	const V1Parses = ParseVersion(v1);
	const V2Parses = ParseVersion(v2);
	
	if (V1Parses.major !== V2Parses.major) {
		return V1Parses.major > V2Parses.major ? 1 : -1;
	}
	if (V1Parses.minor !== V2Parses.minor) {
		return V1Parses.minor > V2Parses.minor ? 1 : -1;
	}
	if (V1Parses.patch !== V2Parses.patch) {
		return V1Parses.patch > V2Parses.patch ? 1 : -1;
	}
	
	const IsBetaOrAlpha = (version) => version.includes('-');
	if (IsBetaOrAlpha(v1) && IsBetaOrAlpha(v2)) {
		const [V1Suffix, V1BetaOrAlpha] = v1.split('-');
		const [V2Suffix, V2BetaOrAlpha] = v2.split('-');

		if (V1Suffix === V2Suffix) {
			const V1Num = parseInt(V1BetaOrAlpha.split('.')[1]);
			const V2Num = parseInt(V2BetaOrAlpha.split('.')[1]);
			return V1Num - V2Num;
		}
	}
	else if(IsBetaOrAlpha(v1) || IsBetaOrAlpha(v2)){
		return IsBetaOrAlpha(v2) ? 1 : -1;
	}
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateCurrentPageInfo(forceUpdate = false){
	const QuestTabMessage = {
		event_name: 'quest-tab-status'
	};
	
	if (current_PageInfo.isComplete && current_PageInfo.isSupport){	
		getCurrentPageUrlKeyIndex(current_PageInfo.url);
		chrome.tabs.sendMessage(current_PageInfo.tabId, QuestTabMessage, async function (responseInfo){
			if (chrome.runtime.lastError){
				current_PageInfo.isScriptRun = false;
				current_PageInfo.isSearched = false;
				current_PageInfo.isMarkhide = false;
				current_PageInfo.keywordFound = {};
			}
			else{
				current_PageInfo.isScriptRun = true;
				current_PageInfo.isSearched = Boolean(responseInfo.isSearched);
				current_PageInfo.isMarkhide = Boolean(responseInfo.isMarkhide);
				current_PageInfo.keywordFound = responseInfo.keywordFound || {};
			}
			
			if (current_SidepageInfo.isVisible && current_SidepageInfo.connectPort !== null){
				current_SidepageInfo.connectPort.postMessage({
					event_name: 'update-sidepanel-status',
					url: current_PageInfo.url,
					indexKey: current_PageInfo.indexKey,
					title: current_PageInfo.title,
					isSupport: current_PageInfo.isSupport,
					isSearched: current_PageInfo.isSearched,
					keywordFound: current_PageInfo.keywordFound,
					module: current_PageInfo.module,
					identificationToken: current_SidepageInfo.identificationToken
				});
			}
			if (current_PopupInfo.isVisible && current_PopupInfo.connectPort !== null){
				current_PopupInfo.connectPort.postMessage({
					event_name: 'update-tab-status',
					isSupport: current_PageInfo.isSupport,
					isScriptRun: current_PageInfo.isScriptRun,
					isSearched: current_PageInfo.isSearched,
					isMarkhide: current_PageInfo.isMarkhide
				});
			}
			
			if (!current_PageInfo.isScriptRun){
				chrome.action.setBadgeText({tabId: current_PageInfo.tabId, text: '！'});
				chrome.action.setBadgeBackgroundColor({tabId: current_PageInfo.tabId, color: '#EA0000'});
			}
			else if (!current_PageInfo.isSearched){
				chrome.action.setBadgeText({tabId: current_PageInfo.tabId, text: ''});
			}
		});
	}
	else {
		current_PageInfo.isScriptRun = false;
		current_PageInfo.isSearched = false;
		current_PageInfo.isMarkhide = false;
		current_PageInfo.keywordFound = {};
		
		if (current_SidepageInfo.isVisible && current_SidepageInfo.connectPort !== null){
			current_SidepageInfo.connectPort.postMessage({
				event_name: 'update-sidepanel-status',
				url: current_PageInfo.url,
				indexKey: current_PageInfo.indexKey,
				title: current_PageInfo.title,
				isSupport: current_PageInfo.isSupport,
				isSearched: current_PageInfo.isSearched,
				keywordFound: current_PageInfo.keywordFound,
				module: current_PageInfo.module,
				identificationToken: current_SidepageInfo.identificationToken
			});
		}
		if (current_PopupInfo.isVisible && current_PopupInfo.connectPort !== null){
			current_PopupInfo.connectPort.postMessage({
				event_name: 'update-tab-status',
				isSupport: current_PageInfo.isSupport,
				isScriptRun: current_PageInfo.isScriptRun,
				isSearched: current_PageInfo.isSearched,
				isMarkhide: current_PageInfo.isMarkhide
			});
		}
		
		if (!current_PageInfo.isSupport){
			chrome.action.setBadgeText({tabId: current_PageInfo.tabId, text: '✕'});
			chrome.action.setBadgeBackgroundColor({tabId: current_PageInfo.tabId, color: '#F9F900'});
		}
		else{
			chrome.action.setBadgeText({tabId: current_PageInfo.tabId, text: ''});
		}
	}
	
	return;
}

async function getCurrentPageUrlKeyIndex(url){
	const UrlInfo = new URL(url);
	current_PageInfo.indexKey = UrlInfo.host;
}

async function getNoteDataForPreview(keywordKeyIndex){
	let returnData = {
		"isFinish": false,
		"isExist": false,
		"noteForPreview": {
			"isEmpty": false,
			"note": null
		}
	};
	
	const ReturnData = await getKeywordData(keywordKeyIndex);

	if (ReturnData.isExist){
		returnData.isExist = true;
		
		try {
			const noteIdForPreview = ReturnData.data.displayOrder[0];
			const noteForPreview = ReturnData.data.note[noteIdForPreview] ;
			
			if (noteForPreview !== undefined){
				returnData.noteForPreview.isEmpty = false;
				returnData.noteForPreview.note = noteForPreview;
				returnData.isFinish = true;
			}
			else{
				returnData.noteForPreview.isEmpty = true;
				returnData.noteForPreview.note = null;
				returnData.isFinish = true;
			}
			
			return returnData;
		} catch (e) {
			returnData.isFinish = false;
			
			console.error("Error in getNoteDataForPreview:", e);
			return returnData;
		}
	}
	else{
		returnData.isFinish = true;
		
		return returnData;
	}
}

async function openSidepanel(specifiedKeyword = null){
	if (!current_SidepageInfo.isVisible){
		chrome.sidePanel.open({tabId: current_PageInfo.tabId});
		
		if (specifiedKeyword != null){
			background_Info.currentKeyword = specifiedKeyword;
		}
	}
}

async function checkIdentificationToken(token){
	return (token == current_SidepageInfo.identificationToken);
}

function convertToNoteFormat(noteContent, noteTimestamp){
	return [noteContent, noteTimestamp, false];
}

// ====== 儲存資料操作 ====== 
async function getKeywordData(keywordKeyIndex){
	let returnData = {
		"isExist": false,
		"data": null
	};
	
	if (keyword_KeyIndex.includes(keywordKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(['KeywordNoteData']);
			if (Result.KeywordNoteData[keywordKeyIndex] !== undefined){
				returnData.isExist = true; 
				returnData.data = Result.KeywordNoteData[keywordKeyIndex];
				
				return returnData;
			}
			
			return returnData;
		} catch (e) {
            console.error("Error in getKeywordData:", e);
            return returnData;
        }
	}
	else{
		return returnData;
	}
}

async function refreshKeywordKeyIndex(){
	let returnData = {
		"isFinish": false
	};
	
	try {
		const Result = await chrome.storage.local.get(['KeywordKeyIndex']);
		if (Result.KeywordKeyIndex !== undefined){
			keyword_KeyIndex = Result.KeywordKeyIndex;
			returnData.isFinish = true;
		}
		
		return returnData;
	} catch (e) {
		console.error("Error in updateKeywordKeyIndex:", e);
		return returnData;
	}
}

async function updateKeywordKeyIndex(){
	let returnData = {
		"isFinish": false
	};
	
	try {
		await chrome.storage.local.set({KeywordKeyIndex: keyword_KeyIndex});
		
		returnData.isFinish = true;
		return returnData;
	} catch (e) {
		console.error("Error in updateKeywordKeyIndex:", e);
		return returnData;
	}
}

async function addKeywordNote(keywordKeyIndex, note, module = {}){
	let returnData = {
		"isExist": false,
		"isFinish": false,
		"afterData": null
	};
	
	if (keyword_KeyIndex.includes(keywordKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(['KeywordNoteData']);
			if(Result.KeywordNoteData === undefined){
                Result.KeywordNoteData = {};
            }
			
			if (Result.KeywordNoteData[keywordKeyIndex] !== undefined){
				returnData.isExist = true; 
				let keywordData = Result.KeywordNoteData[keywordKeyIndex];
				returnData.afterData = JSON.parse(JSON.stringify(keywordData));
				
				const NewNoteIndex = keywordData.note.length;
				keywordData.note.unshift(note);
				keywordData.displayOrder.unshift(NewNoteIndex);
				keywordData.module = module;
				
				Result.KeywordNoteData[keywordKeyIndex] = keywordData;
				await chrome.storage.local.set(Result);
				
				returnData.isFinish = true;
				returnData.afterData = keywordData;
			}
			else{
				let newKeyword = {
					"title": keywordKeyIndex,
					"displayOrder": [],
					"note": [],
					"module": module
				};
				
				if (note){
					newKeyword.note.push(note);
					newKeyword.displayOrder.push(0);
				}
				
				Result.KeywordNoteData[keywordKeyIndex] = newKeyword;
				await chrome.storage.local.set(Result);

				returnData.isExist = true;
				returnData.isFinish = true;
				returnData.afterData = newKeyword;
				
				keyword_KeyIndex = Object.keys(Result.KeywordNoteData);
				updateKeywordKeyIndex();
			}
			
			return returnData;
		} catch (e) {
			returnData.isFinish = false;
			
            console.error("Error in addKeywordNote:", e);
            return returnData;
        }
	}
	else{
		return returnData;
	}
}

async function updateKeywordNoteDisplayOrder(keywordKeyIndex, displayOrder){
	let returnData = {
		"isExist": false,
		"isFinish": false,
		"displayOrder": null
	};
	
	if (keyword_KeyIndex.includes(keywordKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(['KeywordNoteData']);
			if(Result.KeywordNoteData === undefined){
                Result.KeywordNoteData = {};
            }
			
			if (Result.KeywordNoteData[keywordKeyIndex] !== undefined){
				returnData.isExist = true; 
				let KeywordData = Result.KeywordNoteData[keywordKeyIndex];
				
				returnData.displayOrder = KeywordData.displayOrder;
				const NoteLength = KeywordData.note.length;
				
				if (displayOrder.length == NoteLength){
					KeywordData.displayOrder = displayOrder;
					
					Result.KeywordNoteData[keywordKeyIndex] = KeywordData;
					
					await chrome.storage.local.set(Result)
					
					returnData.isFinish = true;
					returnData.displayOrder = displayOrder;
				}
				else{
					return returnData;
				}
			}
			
			return returnData;
		} catch (e) {
            console.error("Error in updateKeywordNoteDisplayOrder:", e);
            return returnData;
        }
	}
	else{
		return returnData;
	}
}

async function deleteKeywordNote(keywordKeyIndex, noteIndex){
	let returnData = {
		"isExist": false,
		"isFinish": false,
		"afterData": null
	};
	
	if (keyword_KeyIndex.includes(keywordKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(['KeywordNoteData']);
			if (Result.KeywordNoteData[keywordKeyIndex] !== undefined){
				returnData.isExist = true; 
				let keywordData = Result.KeywordNoteData[keywordKeyIndex];
				returnData.afterData = JSON.parse(JSON.stringify(keywordData));
				
				if (keywordData.note.length >= noteIndex){
					keywordData.note.splice(noteIndex, 1);
					for (let i = 0; i < keywordData.displayOrder.length; i++){
						if (keywordData.displayOrder[i] > noteIndex){
							keywordData.displayOrder[i] -= 1;
						}
						else if (keywordData.displayOrder[i] == noteIndex){
							keywordData.note.splice(i, 1);
							i -= 1;
						}
					}
					
					Result.KeywordNoteData[keywordKeyIndex] = keywordData;
					await chrome.storage.local.set(Result);
					
					returnData.isFinish = true;
					returnData.afterData = keywordData;
				}
			}
			
			return returnData;
		} catch (e) {
			returnData.isFinish = false;
			
            console.error("Error in deleteKeywordNote:", e);
            return returnData;
        }
	}
	else{
		return returnData;
	}
}

async function editKeywordNote(keywordKeyIndex, noteIndex, note, module = {}){
	let returnData = {
		"isExist": false,
		"isFinish": false,
		"afterData": null
	};
	
	if (keyword_KeyIndex.includes(keywordKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(['KeywordNoteData']);
			if(Result.KeywordNoteData === undefined){
                Result.KeywordNoteData = {};
            }
			
			if (Result.KeywordNoteData[keywordKeyIndex] !== undefined){
				returnData.isExist = true; 
				let keywordData = Result.KeywordNoteData[keywordKeyIndex];
				returnData.afterData = JSON.parse(JSON.stringify(keywordData));
				
				if (keywordData.note.length >= noteIndex){
					keywordData.note.splice(noteIndex, 1, note);
					keywordData.module = module;
				
					Result.KeywordNoteData[keywordKeyIndex] = keywordData;
					await chrome.storage.local.set(Result);
					
					returnData.isFinish = true;
					returnData.afterData = keywordData;
				}
			}
			
			return returnData;
		} catch (e) {
			returnData.isFinish = false;
			
            console.error("Error in addKeywordNote:", e);
            return returnData;
        }
	}
	else{
		return returnData;
	}
}

async function deleteKeyword(keywordKeyIndex){
	let returnData = {
		"isExist": false,
		"isFinish": false
	};
	
	if (keyword_KeyIndex.includes(keywordKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(['KeywordNoteData']);
			if (Result.KeywordNoteData[keywordKeyIndex] !== undefined){
				returnData.isExist = true; 
				delete Result.KeywordNoteData[keywordKeyIndex];
				
				await chrome.storage.local.set(Result);
					
				returnData.isFinish = true;
				
				keyword_KeyIndex = Object.keys(Result.KeywordNoteData);
				updateKeywordKeyIndex();
				removeKeywordInDisplayOrder(keywordKeyIndex);
			}
			
			return returnData;
		} catch (e) {
			returnData.isFinish = false;
			
            console.error("Error in deleteKeyword:", e);
            return returnData;
        }
	}
	else{
		return returnData;
	}
}

async function getUrlData(urlKeyIndex){
	let returnData = {
		"isExist": false,
		"data": null
	};
	
	if (url_KeyIndex.includes(urlKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(['UrlNoteData']);
			if (Result.UrlNoteData[urlKeyIndex] !== undefined){
				returnData.isExist = true; 
				returnData.data = Result.UrlNoteData[urlKeyIndex];
				
				return returnData;
			}
			
			return returnData;
		} catch (e) {
            console.error("Error in getUrlData:", e);
            return returnData;
        }
	}
	else{
		return returnData;
	}
}

async function refreshUrlKeyIndex(){
	let returnData = {
		"isFinish": false
	};
	
	try {
		const Result = await chrome.storage.local.get(['UrlKeyIndex']);
		if (Result.UrlKeyIndex !== undefined){
			url_KeyIndex = Result.UrlKeyIndex;
			returnData.isFinish = true;
		}
		
		return returnData;
	} catch (e) {
		console.error("Error in updateKeywordKeyIndex:", e);
		return returnData;
	}
}

async function updateUrlKeyIndex(){
	let returnData = {
		"isFinish": false
	};
	
	try {
		await chrome.storage.local.set({UrlKeyIndex: url_KeyIndex});
		
		returnData.isFinish = true;
		return returnData;
	} catch (e) {
		console.error("Error in updateUrlKeyIndex:", e);
		return returnData;
	}
}

async function addUrlNote(urlKeyIndex, note, module = {}){
	let returnData = {
		"isExist": false,
		"isFinish": false,
		"afterData": null
	};
	
	if (url_KeyIndex.includes(urlKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(['UrlNoteData']);
			if(Result.UrlNoteData === undefined){
                Result.UrlNoteData = {};
            }
			
			if (Result.UrlNoteData[urlKeyIndex] !== undefined){
				returnData.isExist = true; 
				let urlData = Result.UrlNoteData[urlKeyIndex];
				returnData.afterData = JSON.parse(JSON.stringify(urlData));
				
				const NewNoteIndex = urlData.note.length;
				urlData.note.unshift(note);
				urlData.displayOrder.unshift(NewNoteIndex);
				urlData.module = module;
				
				Result.UrlNoteData[urlKeyIndex] = urlData;
				await chrome.storage.local.set(Result);
				
				returnData.isFinish = true;
				returnData.afterData = urlData;
			}
			else{
				let newUrl = {
					"title": urlKeyIndex,
					"displayOrder": [0],
					"note": [note],
					"module": module
				};
				
				Result.UrlNoteData[urlKeyIndex] = newUrl;
				await chrome.storage.local.set(Result);

				returnData.isExist = true;
				returnData.isFinish = true;
				returnData.afterData = newUrl;
				
				url_KeyIndex = Object.keys(Result.UrlNoteData);
				updateUrlKeyIndex();
			}
			
			return returnData;
		} catch (e) {
			returnData.isFinish = false;
			
            console.error("Error in addUrlNote:", e);
            return returnData;
        }
	}
	else{
		return returnData;
	}
}

async function updateUrlNoteDisplayOrder(urlKeyIndex, displayOrder){
	let returnData = {
		"isExist": false,
		"isFinish": false,
		"displayOrder": null
	};
	
	if (url_KeyIndex.includes(urlKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(['UrlNoteData']);
			if(Result.UrlNoteData === undefined){
                Result.UrlNoteData = {};
            }
			
			if (Result.UrlNoteData[urlKeyIndex] !== undefined){
				returnData.isExist = true; 
				let urlData = Result.UrlNoteData[urlKeyIndex];
				
				returnData.displayOrder = urlData.displayOrder;
				const NoteLength = urlData.note.length;
				
				if (displayOrder.length == NoteLength){
					urlData.displayOrder = displayOrder;
					
					Result.UrlNoteData[urlKeyIndex] = urlData;
					
					await chrome.storage.local.set(Result)
					
					returnData.isFinish = true;
					returnData.displayOrder = displayOrder;
				}
				else{
					return returnData;
				}
			}
			
			return returnData;
		} catch (e) {
            console.error("Error in updateUrlDisplayOrder:", e);
            return returnData;
        }
	}
	else{
		return returnData;
	}
}

async function deleteUrlNote(urlKeyIndex, noteIndex){
	let returnData = {
		"isExist": false,
		"isFinish": false,
		"afterData": null
	};
	
	if (url_KeyIndex.includes(urlKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(['UrlNoteData']);
			if (Result.UrlNoteData[urlKeyIndex] !== undefined){
				returnData.isExist = true; 
				let urlData = Result.UrlNoteData[urlKeyIndex];
				returnData.afterData = JSON.parse(JSON.stringify(urlData));
				
				if (urlData.note.length >= noteIndex){
					urlData.note.splice(noteIndex, 1);
					for (let i = 0; i < urlData.displayOrder.length; i++){
						if (urlData.displayOrder[i] > noteIndex){
							urlData.displayOrder[i] -= 1;
						}
						else if (urlData.displayOrder[i] == noteIndex){
							urlData.note.splice(i, 1);
							i -= 1;
						}
					}
					
					Result.UrlNoteData[urlKeyIndex] = urlData;
					await chrome.storage.local.set(Result);
					
					returnData.isFinish = true;
					returnData.afterData = urlData;
				}
			}
			
			return returnData;
		} catch (e) {
			returnData.isFinish = false;
			
            console.error("Error in deleteUrlNote:", e);
            return returnData;
        }
	}
	else{
		return returnData;
	}
}

async function editUrlNote(urlKeyIndex, noteIndex, note, module = {}){
	let returnData = {
		"isExist": false,
		"isFinish": false,
		"afterData": null
	};
	
	if (url_KeyIndex.includes(urlKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(['UrlNoteData']);
			if(Result.UrlNoteData === undefined){
                Result.UrlNoteData = {};
            }
			
			if (Result.UrlNoteData[urlKeyIndex] !== undefined){
				returnData.isExist = true; 
				let urlData = Result.UrlNoteData[urlKeyIndex];
				returnData.afterData = JSON.parse(JSON.stringify(urlData));
				
				if (urlData.note.length >= noteIndex){
					urlData.note.splice(noteIndex, 1, note);
					urlData.module = module;
				
					Result.UrlNoteData[urlKeyIndex] = urlData;
					await chrome.storage.local.set(Result);
					
					returnData.isFinish = true;
					returnData.afterData = urlData;
				}
			}
			
			return returnData;
		} catch (e) {
			returnData.isFinish = false;
			
            console.error("Error in addUrlNote:", e);
            return returnData;
        }
	}
	else{
		return returnData;
	}
}

async function deleteUrl(urlKeyIndex){
	let returnData = {
		"isExist": false,
		"isFinish": false
	};
	
	if (url_KeyIndex.includes(urlKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(['UrlNoteData']);
			if (Result.UrlNoteData[urlKeyIndex] !== undefined){
				returnData.isExist = true; 
				delete Result.UrlNoteData[urlKeyIndex];
				
				await chrome.storage.local.set(Result);
					
				returnData.isFinish = true;
				
				url_KeyIndex = Object.keys(Result.UrlNoteData);
				updateUrlKeyIndex();
			}
			
			return returnData;
		} catch (e) {
			returnData.isFinish = false;
			
            console.error("Error in deleteUrl:", e);
            return returnData;
        }
	}
	else{
		return returnData;
	}
}

async function getKeywordDisplayOrder(){
	let returnData = {
		"isFinish": false,
		"displayOrder": []
	};
	
	try {
		const Result = await chrome.storage.local.get(["KeywordDisplayOrder"]);
		if(Result.KeywordDisplayOrder === undefined){
			Result.KeywordDisplayOrder = {
				"maxKeywordDisplay": 10,
				"displayCRF": []
			};
		}
		
		if (Result.KeywordDisplayOrder.displayCRF !== undefined){
			const displayCRF = Result.KeywordDisplayOrder.displayCRF;
			let display_list = [];
			
			const displayListLength = Math.min(displayCRF.length, Result.KeywordDisplayOrder.maxKeywordDisplay);
			for (let i = 0; i < displayListLength; i++){
				display_list.push(displayCRF[i][0]);
			}
			
			returnData.displayOrder = display_list;
			returnData.isFinish = true;
		}
		
		return returnData;
	} catch (e) {
		returnData.isFinish = false;
		
		console.error("Error in getKeywordDisplayOrder:", e);
		return returnData;
	}
}

async function updateKeywordDisplayOrder(keywordKeyIndex){
	let returnData = {
		"isFinish": false
	};
	
	if (keyword_KeyIndex.includes(keywordKeyIndex)){
		try {
			const Result = await chrome.storage.local.get(["KeywordDisplayOrder"]);
			if(Result.KeywordDisplayOrder === undefined){
				Result.KeywordDisplayOrder = {
					"maxKeywordDisplay": 10,
					"displayCRF": []
				};
			}
			
			if (Result.KeywordDisplayOrder.displayCRF !== undefined){
				let displayCRF = Result.KeywordDisplayOrder.displayCRF;
				let isInclude = false;
				let lessCRF = -1;
				
				for (let i = 0; i < displayCRF.length; i++){
					if (displayCRF[i][0] == keywordKeyIndex){
						displayCRF[i][1] += 1;
						isInclude = true;
					}
					else{
						displayCRF[i][1] *= 0.9;
						if (lessCRF > displayCRF[i][1]){
							lessCRF = displayCRF[i][1];
						}
					}
				}
				
				if(!isInclude){
					if (displayCRF.length > Result.KeywordDisplayOrder.maxKeywordDisplay){
						displayCRF[displayCRF.length - 1] = [keywordKeyIndex, 1.0];
					}
					else{
						displayCRF.push([keywordKeyIndex, 1.0]);
					}
				}
				
				displayCRF.sort((a, b) => {
					return b[1] - a[1]
				});
				
				Result.KeywordDisplayOrder.displayCRF = displayCRF;
				
				await chrome.storage.local.set(Result);
				returnData.isFinish = true;
			}
			
			return returnData;
		} catch (e) {
			returnData.isFinish = false;
			
            console.error("Error in updateKeywordDisplayOrder:", e);
            return returnData;
        }
	}
}

async function removeKeywordInDisplayOrder(keywordKeyIndex){
	let returnData = {
		"isFinish": false
	};
	
	try {
		const Result = await chrome.storage.local.get(["KeywordDisplayOrder"]);
		if(Result.KeywordDisplayOrder === undefined){
			Result.KeywordDisplayOrder = {
				"maxKeywordDisplay": 10,
				"displayCRF": []
			};
		}
		
		if (Result.KeywordDisplayOrder.displayCRF !== undefined){
			let displayCRF = Result.KeywordDisplayOrder.displayCRF;
			
			for (let i = 0; i < displayCRF.length; i++){
				if (displayCRF[i][0] == keywordKeyIndex){
					Result.KeywordDisplayOrder.displayCRF.splice(i, 1);
					break;
				}
			}
			
			await chrome.storage.local.set(Result);
			returnData.isFinish = true;
			
			if (background_Info.currentKeyword == keywordKeyIndex){
				background_Info.currentKeyword = displayCRF[0][0];
			}
		}
		
		return returnData;
	} catch (e) {
		returnData.isFinish = false;
		
		console.error("Error in removeKeywordInDisplayOrder:", e);
		return returnData;
	}
}

async function questSetting(settingNames, moduleName = null){
	let returnData = {
		"isFinish": false,
		"settings": {}
	};
	
	try {
		const Result = await chrome.storage.local.get(["KeywordsSetting"]);
		
		if (Result.KeywordsSetting !== undefined){
			if (Boolean(moduleName)){
				if (Result.KeywordsSetting[moduleName] !== undefined){
					settingNames.forEach((settingName) => {
						if (Result.KeywordsSetting[moduleName][settingName] !== undefined){
							returnData.settings[settingName] = Result.KeywordsSetting[moduleName][settingName];
							returnData.isFinish = true;
						}
					});
				}
			}
			else{
				settingNames.forEach((settingName) => {
					if (Result.KeywordsSetting[settingName] !== undefined){
						returnData.settings[settingName] = Result.KeywordsSetting[settingName];
						returnData.isFinish = true;
					}
				});
				
			}
		}
		
		return returnData;
	} catch (e) {
		returnData.isFinish = false;
		
		console.error("Error in questSetting:", e);
		return returnData;
	}
}

async function setSetting(settingName, value, moduleName = null){
	let returnData = {
		"isFinish": false,
		"afterValue": null
	};
	
	try {
		const Result = await chrome.storage.local.get(["KeywordsSetting"]);
		
		if (Result.KeywordsSetting !== undefined){
			if (Boolean(moduleName)){
				if (Result.KeywordsSetting[moduleName] !== undefined){
					if (Result.KeywordsSetting[moduleName][settingName] !== undefined){
						returnData.afterValue = JSON.parse(JSON.stringify(Result.KeywordsSetting[moduleName][settingName]));
						Result.KeywordsSetting[moduleName][settingName] = value;
						returnData.isFinish = true;
						returnData.afterValue = value;
					}
				}
			}
			else if (Result.KeywordsSetting[settingName] !== undefined){
				returnData.afterValue = JSON.parse(JSON.stringify(Result.KeywordsSetting[settingName]));
				Result.KeywordsSetting[settingName] = value;
				returnData.isFinish = true;
				returnData.afterValue = value;
			}
		}
		
		if (returnData.isFinish){
			await chrome.storage.local.set(Result);
			returnData[settingName] = value;
		}
		
		return returnData;
	} catch (e) {
		returnData.isFinish = false;
		
		console.error("Error in questSetting:", e);
		return returnData;
	}
}

async function moduleDataRead(moduleName, keys){
	let returnData = {
		"isFinish": false,
		"keysData": null
	};
	
	try {
		const Result = await chrome.storage.local.get(["ModuleData"]);
		if(Result.ModuleData === undefined){
			Result.ModuleData = {};
		}
		
		if (Result.ModuleData[moduleName] !== undefined){
			let replyData = new Object();
			
			while(keys.length){
				const Key = keys.pop();
				const Data = module_datas[modulename][Key];
				
				if (Data){
					replyData[Key] = Data;
				}
			}
			
			returnData.keysData = replyData;
		}
		else{
			returnData.keysData = undefined;
		}
		
		return returnData;
	} catch (e) {
		returnData.isFinish = false;
		
		console.error("Error in moduleDataRead:", e);
		return returnData;
	}
}

async function moduleDataWrite(moduleName, key, value){
	let returnData = {
		"isFinish": false
	};
	
	try {
		const Result = await chrome.storage.local.get(["ModuleData"]);
		if(Result.ModuleData === undefined){
			Result.ModuleData = {};
		}
		
		if (Result.ModuleData[moduleName] !== undefined){
			let replyData = new Object();
			
			Result.ModuleData[moduleName][key] = value;
			
			await chrome.storage.local.set(Result);
			returnData.isFinish = true;
		}
		
		return returnData;
	} catch (e) {
		returnData.isFinish = false;
		
		console.error("Error in moduleDataRead:", e);
		return returnData;
	}
}

// ====== 檔案存取 ====== 
async function getInitTagFileData(){
	let returnData = {
		"isFinish": false,
		"initTagData": null
	};
	
	try {
		const Response = await fetch("/data_file/default_data.json");
		
		returnData.initTagData = await Response.json();
		returnData.isFinish = true;
		
		return returnData;
	} catch (e) {
		returnData.isFinish = false;
		
		console.error("Error in getInitTagFileData:", e);
		return returnData;
	}
}

async function initialDataProcess(){
	let returnData = {
		"isFinish": false
	};
	
	try {
		const InitTagFile = await getInitTagFileData();
		
		if (InitTagFile.isFinish){
			await chrome.storage.local.set(InitTagFile.initTagData);
			returnData.isFinish = true;
		}
		
		return returnData;
	} catch (e) {
		returnData.isFinish = false;
		
		console.error("Error in initialDataProcess:", e);
		return returnData;
	}
}

async function exportBackupData(){
	let returnData = {
		"isFinish": false,
		"exportData": null
	};
	
	try {
		const Result = await chrome.storage.local.get(KEYWORD_RESERVED_WORDS);
		const InitTagFile = await getInitTagFileData();
		
		for (let i = 0; i < KEYWORD_RESERVED_WORDS.length; i++){
			if (Result[KEYWORD_RESERVED_WORDS[i]] === undefined){
				Result[KEYWORD_RESERVED_WORDS[i]] = InitTagFile[KEYWORD_RESERVED_WORDS[i]];
			}
		}
		
		returnData.exportData = Result;
		returnData.isFinish = true;
		
		return returnData;
	} catch (e) {
		returnData.isFinish = false;
		
		console.error("Error in exportBackupData:", e);
		return returnData;
	}
}

async function inportBackupData(importData, isOverwrite){
	let returnData = {
		"isFinish": false
	};
	
	if (!Boolean(importData)){
		return returnData;
	}
	
	try {
		if (isOverwrite){
			let initTagFile = await getInitTagFileData();
			
			for (let i = 0; i < KEYWORD_RESERVED_WORDS.length; i++){
				if (importData[KEYWORD_RESERVED_WORDS[i]] === undefined){
					initTagFile[KEYWORD_RESERVED_WORDS[i]] = importData[KEYWORD_RESERVED_WORDS[i]];
				}
			}
			
			await chrome.storage.local.set(initTagFile);
			returnData.isFinish = true;
		}
		else{
			let localStorage = await chrome.storage.local.get(KEYWORD_RESERVED_WORDS);
			
			if (importData.KeywordKeyIndex !== undefined){
				importData.KeywordKeyIndex.forEach((ImportDataKeyword) => {
					if (localStorage.KeywordKeyIndex.includes(ImportDataKeyword)){
						if (importData.KeywordNoteData[ImportDataKeyword] !== undefined){
							let nextNoteId = importData.KeywordNoteData[ImportDataKeyword].length;
							
							importData.KeywordNoteData[ImportDataKeyword].note.forEach((importNote) => {
								localStorage.KeywordNoteData[ImportDataKeyword].note.push(importNote);
								localStorage.KeywordNoteData[ImportDataKeyword].displayOrder.push(nextNoteId);
								nextNoteId += 1;
							});
						}
					}
					else if (importData.KeywordNoteData[ImportDataKeyword] !== undefined){
						localStorage.KeywordKeyIndex.push(ImportDataKeyword);
						
						importData.KeywordNoteData[ImportDataKeyword] = {
							"title": importData.KeywordNoteData[ImportDataKeyword].title || ImportDataKeyword,
							"displayOrder": importData.KeywordNoteData[ImportDataKeyword].displayOrder || [],
							"note": importData.KeywordNoteData[ImportDataKeyword].note || [],
							"module": importData.KeywordNoteData[ImportDataKeyword].module || {}
						}
					}
				});
			}
			
			if (importData.UrlKeyIndex !== undefined){
				importData.UrlKeyIndex.forEach((ImportDataUrl) => {
					if (localStorage.UrlKeyIndex.includes(ImportDataUrl)){
						if (importData.UrlNoteData[ImportDataUrl] !== undefined){
							let nextNoteId = importData.UrlNoteData[ImportDataUrl].length;
							
							importData.UrlNoteData[ImportDataUrl].note.forEach((importNote) => {
								localStorage.UrlNoteData[ImportDataUrl].note.push(importNote);
								localStorage.UrlNoteData[ImportDataUrl].displayOrder.push(nextNoteId);
								nextNoteId += 1;
							});
						}
					}
					else if (importData.UrlNoteData[ImportDataUrl] !== undefined){
						localStorage.UrlKeyIndex.push(ImportDataUrl);
						
						importData.UrlNoteData[ImportDataUrl] = {
							"title": importData.UrlNoteData[ImportDataUrl].title || ImportDataUrl,
							"displayOrder": importData.UrlNoteData[ImportDataUrl].displayOrder || [],
							"note": importData.UrlNoteData[ImportDataUrl].note || [],
							"module": importData.UrlNoteData[ImportDataUrl].module || {}
						}
					}
				});
			}
			
			// moduleInportBackupData
			
			await chrome.storage.local.set(localStorage);
			returnData.isFinish = true;
		}
		
		return returnData;
	} catch (e) {
		returnData.isFinish = false;
		
		console.error("Error in inportBackupData:", e);
		return returnData;
	}
}

// ====== 事件處理 ====== 
chrome.tabs.onActivated.addListener(async function (info){ //視窗中的使用中分頁變更時觸發
	current_PageInfo = {
		url: "",
		indexKey: "",
		title: "",
		tabId: info.tabId,
		isComplete: false,
		isSupport: false,
		isScriptRun: false,
		isSearched: false,
		keywordFound: {},
		isMarkhide: false,
		module: {}
	}

	console.log(`currentpage_TabId: ${current_PageInfo.tabId}`);
	
	try {
		const Tab = await chrome.tabs.get(current_PageInfo.tabId);
		
		current_PageInfo.url = Tab.url;
		current_PageInfo.title = Tab.title;
		current_PageInfo.isComplete = (Tab.status == "complete");
		current_PageInfo.isSupport = (current_PageInfo.url.startsWith('http://') || current_PageInfo.url.startsWith('https://'));
	} catch (e) {
		console.log('tabs.onActivated', e);
		current_PageInfo.isComplete = false;
	}
	
	updateCurrentPageInfo();
	loadStartupData();
});

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab){ //分頁更新時觸發
	if (current_PageInfo.tabId == tabId && changeInfo.status !== undefined){
		if (!current_PageInfo.isComplete && (changeInfo.status == "complete")){
			current_PageInfo.url = tab.url;
			current_PageInfo.title = tab.title;
			current_PageInfo.isComplete = true;
			current_PageInfo.isSupport = (current_PageInfo.url.startsWith('http://') || current_PageInfo.url.startsWith('https://'));
		}
		else if (current_PageInfo.isComplete && (changeInfo.status != "complete")){
			current_PageInfo.isComplete = false;
		}
		
		updateCurrentPageInfo();
	}
});

chrome.contextMenus.onClicked.addListener(async function (info, tab) { //內容功能表功能觸發
	switch (info.menuItemId) {
		case 'KDN_keywordselect':
			if (KEYWORD_RESERVED_WORDS.includes(info.selectionText)){
				triggerNotificationMessage(chrome.i18n.getMessage('add_new_keyword_reserved_error'), 'error');
			}
			else if (info.selectionText != ""){
					
				if (current_SidepageInfo.isVisible){
					current_SidepageInfo.connectPort.postMessage({
						event_name: 'show-selected-keyword',
						keywordSelected: info.selectionText
					});
				}
				else{
					background_Info.currentKeyword = info.selectionText;
					chrome.sidePanel.open({tabId: current_PageInfo.tabId});
				}
			}
			
			break;
	}
});

chrome.commands.onCommand.addListener(function (command){ //快捷鍵觸發
	switch (command) {
		case 'KDN_SearchKeyword':
			if (current_PageInfo.isScriptRun){
				if (!current_PageInfo.isSearched){
					chrome.tabs.sendMessage(current_PageInfo.tabId, {event_name: 'keyword-mark-search', keyword_keyindex: keyword_KeyIndex}, function (ReturnData){
						if (ReturnData.isFinish){
							updateCurrentPageInfo();
							chrome.action.setBadgeText({tabId: current_PageInfo.tabId, text: `${ReturnData.found}`});
						}
					});
				}
				else if(current_PageInfo.isMarkhide){
					chrome.tabs.sendMessage(current_PageInfo.tabId, {event_name: 'keyword-mark-show'}, function (ReturnData){
						if (ReturnData.isFinish){
							updateCurrentPageInfo();
						}
					});
				}
				else{
					chrome.tabs.sendMessage(current_PageInfo.tabId, {event_name: 'keyword-mark-hide'}, function (ReturnData){
						if (ReturnData.isFinish){
							updateCurrentPageInfo();
						}
					});
				}
			}
			else{
				//needErrorMessage
			}
			
			break;
		case 'KDN_Sidepanel':
			openSidepanel();
			
			break;
	}
});

chrome.notifications.onButtonClicked.addListener(async function(notificationId, btnIdx){ //帶選項通知訊息選項觸發
    if (Boolean(confirm_NotificationsData[notificationId])) {
		switch (confirm_NotificationsData[notificationId].notification_type){
			case 'new_version':
				if (btnIdx == 0){
					chrome.tabs.create({ url: 'https://github.com/wantZzz/Keyword-Dictionary-Notes/releases/latest' });
				}
				else if(btnIdx == 1){
					const LatestVersion = confirm_NotificationsData[notificationId].latest_version;
					const QuestResult = await questSetting('github_');
					
					if (QuestResult.isFinish){
						QuestResult.github_['version'] = LatestVersion;
						await setSetting('github_', QuestResult.github_);
					}
					
					delete confirm_NotificationsData[notificationId];
				}
				
				break;
			case 'function':
				if (btnIdx === 0){
					confirm_NotificationsData[notificationId].funCall();
					delete confirm_NotificationsData[notificationId];
				}
				break;
			case 'initialization_data':
				if (btnIdx == 0){
					const Result = await initialDataProcess();
					if (!Result.isFinish){
						//needErrorMessage
					}
				}
				
				break;
		}
    }
	else{
		//needErrorMessage
	}
});

chrome.runtime.onInstalled.addListener(async function (details){ //安裝、更新觸發
	if (details.reason == "install"){
		const ReturnData = await initialDataProcess();
		
		if (ReturnData.isFinish){
			const KeywordRefreshReturnData = await refreshKeywordKeyIndex();
			const UrlRefreshReturnData = await refreshUrlKeyIndex();
			
			loadStartupData();
		}
		else{
			//needErrorMessage
		}
	}
	else{
		loadStartupData();
	}

	chrome.contextMenus.create({  
        id: 'KDN_keywordselect',
        type: 'normal',
        title: '建立以 "%s" 為索引的筆記',
        contexts: ['selection']
    });
});

chrome.runtime.onStartup.addListener(loadStartupData); //啟動(不含安裝、更新)觸發

// ====== 資料接收 ====== 
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse){ //短期連接通訊
	switch (request.event_name) {
		//訊息傳送
		case 'send-notification-message':
			sendResponse({});
			createNotificationMessage(request.message, request.notification_type);
			
			break;
			
		//請求儲存資料
		case 'quest-keyword-notedata-preview':
			getNoteDataForPreview(request.keywordKeyIndex)
			.then((PreviewReturnData) => {
				sendResponse(PreviewReturnData);
			});
			
			break;
			
		case 'quest-current-keyword':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					sendResponse({currentKeyword: background_Info.currentKeyword});
					
					if (!keyword_KeyIndex.includes(background_Info.currentKeyword)){
						getKeywordDisplayOrder()
						.then((DisplayOrderReturnData) => {
							if (DisplayOrderReturnData.isFinish){
								background_Info.currentKeyword = DisplayOrderReturnData.displayOrder[0];
							}
						});
					}
				}
				else {
					sendResponse({});
				}
			});
			
			break;
			
		case 'quest-keyword-notedata':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					getKeywordData(request.keywordKeyIndex)
					.then((returnData) => {
						sendResponse(returnData);
						
						if (!returnData.isFirst && returnData.isExist){
							updateKeywordDisplayOrder(request.keywordKeyIndex);
						}
					});
				}
				else{
					sendResponse({});
				}
			});
			
			
			break;
			
		case 'quest-url-notedata':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					getUrlData(request.urlKeyIndex)
					.then((returnData) => {
						sendResponse(returnData);
					});
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		case 'quest-keyword-display-order':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					getKeywordDisplayOrder()
					.then((returnData) => {
						sendResponse(returnData);
					});
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		case 'quest-keyword-list':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					sendResponse({keywordKeyIndex: keyword_KeyIndex});
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		case 'quest-setting-data':
			questSetting(request.settingNames, request.moduleName)
			.then((returnData) => {
				sendResponse(returnData);
			});
			
			break;
			
		case 'update-setting-change':
			setSetting(request.settingName, request.value, request.moduleName)
			.then((returnData) => {
				sendResponse(returnData);
			});
			
			break;
			
		//請求更改資料
		case 'update-keyword-display-order':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					updateKeywordNoteDisplayOrder(request.keywordKeyIndex, request.displayOrder)
					.then((returnData) => {
						sendResponse(returnData);
					});
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		case 'update-url-display-order':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					updateUrlNoteDisplayOrder(request.urlKeyIndex, request.displayOrder)
					.then((returnData) => {
						sendResponse(returnData);
					});
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		case 'new-keyword-notedata':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					const NoteTimestamp = datetimeOutputFormat();
					const NoteDataForSave = convertToNoteFormat(request.noteContent, NoteTimestamp);
					addKeywordNote(request.keywordKeyIndex, NoteDataForSave)
					.then((returnData) => {
						returnData.noteTimestamp = NoteTimestamp;
						sendResponse(returnData);
					});
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		case 'new-url-notedata':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					const NoteTimestamp = datetimeOutputFormat();
					const NoteDataForSave = convertToNoteFormat(request.noteContent, NoteTimestamp);
					addUrlNote(request.urlKeyIndex, NoteDataForSave)
					.then((returnData) => {
						returnData.noteTimestamp = NoteTimestamp;
						sendResponse(returnData);
					});
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		case 'update-keyword-notedata':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					const NoteTimestamp = datetimeOutputFormat();
					const NoteDataForSave = convertToNoteFormat(request.noteContent, NoteTimestamp);
					editKeywordNote(request.keywordKeyIndex, request.noteId, NoteDataForSave)
					.then((returnData) => {
						returnData.noteTimestamp = NoteTimestamp;
						sendResponse(returnData);
					});
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		case 'update-url-notedata':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					const NoteTimestamp = datetimeOutputFormat();
					const NoteDataForSave = convertToNoteFormat(request.noteContent, NoteTimestamp);
					editUrlNote(request.urlKeyIndex, request.noteId, NoteDataForSave)
					.then((returnData) => {
						returnData.noteTimestamp = NoteTimestamp;
						sendResponse(returnData);
					});
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		case 'delete-keyword-noteindex':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					const funcall = () => {
						deleteKeyword(request.keywordKeyIndex)
						.then((returnData) => {
							sendResponse(returnData);
						});
					}
					const OptionData = {
						notification_type: 'function',
						funCall: funcall
					};
					
					createConfirmNotificationMessage(chrome.i18n.getMessage('options_delete_keyword'), 'delete', OptionData);
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		case 'delete-url-noteindex':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					const funcall = () => {
						deleteUrl(request.urlKeyIndex)
						.then((returnData) => {
							sendResponse(returnData);
						});
					}
					const OptionData = {
						notification_type: 'function',
						funCall: funcall
					};
					
					createConfirmNotificationMessage(chrome.i18n.getMessage('options_delete_url'), 'delete', OptionData);
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		case 'delete-keyword-note':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					const funcall = () => {
						deleteKeywordNote(request.keywordKeyIndex, request.noteIndex)
						.then((returnData) => {
							sendResponse(returnData);
						});
					}
					const OptionData = {
						notification_type: 'function',
						funCall: funcall
					};
					
					createConfirmNotificationMessage(chrome.i18n.getMessage('options_delete_keyword_note'), 'delete', OptionData);
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		case 'update-url-note':
			checkIdentificationToken(request.token)
			.then((isPass) => {
				if (isPass){
					const funcall = () => {
						deleteUrlNote(request.urlKeyIndex, request.noteIndex)
						.then((returnData) => {
							sendResponse(returnData);
						});
					}
					const OptionData = {
						notification_type: 'function',
						funCall: funcall
					};
					
					createConfirmNotificationMessage(chrome.i18n.getMessage('options_delete_url_note'), 'delete', OptionData);
				}
				else{
					sendResponse({});
				}
			});
			
			break;
			
		//開啟側邊欄
		case 'quest-open-sidepanel':
			sendResponse({});
			
			if (request.isSpecifiedKeywords){
				openSidepanel(request.keyword);
			}
			else{
				openSidepanel();
			}
			
			break;
			
		//test
		case 'test-current-pageinfo':
			sendResponse({});
			console.log(current_PageInfo);
			
			break;
	}
	
	console.log(request.event_name);
	return true;
});

chrome.runtime.onConnect.addListener(async function (port){ //長期連接通訊
	switch (port.name) {
		case 'Sidepanel':
			current_SidepageInfo.isVisible = true;
			current_SidepageInfo.connectPort = port;
			current_SidepageInfo.identificationToken = Math.random().toString(36).substr(2);
			
			current_SidepageInfo.connectPort.onMessage.addListener(onMessageFromSidepanel);
			current_SidepageInfo.connectPort.onDisconnect.addListener(async function (){
				current_SidepageInfo = {
					isVisible: false,
					connectPort: null,
					identificationToken: "",
					keywordShow: {
						title: "",
						indexKey: "",
						module: {}
					},
					urlShow: {
						title: "",
						indexKey: "",
						module: {}
					}
				};
			});
			
			break;
		case 'Popup':
			current_PopupInfo.isVisible = true;
			current_PopupInfo.connectPort = port;
			
			current_PopupInfo.connectPort.onMessage.addListener(onMessageFromPopup);
			current_PopupInfo.connectPort.onDisconnect.addListener(async function (){
				current_PopupInfo = {
					isVisible: false,
					connectPort: null
				};
			});
			
			break;
	}
});
function onMessageFromSidepanel(msg){
	switch (msg.event_name) {
		case 'refresh-tab-status':
			updateCurrentPageInfo(true);
			break;
			
		case 'keyword-previous-mark':
			chrome.tabs.sendMessage(current_PageInfo.tabId, msg);
			break;
		case 'keyword-next-mark':
			chrome.tabs.sendMessage(current_PageInfo.tabId, msg);
			break;	
	}
}
function onMessageFromPopup(msg){
	switch (msg.event_name) {
		case 'quest-tab-status':
			current_PopupInfo.connectPort.postMessage({
				event_name: 'update-tab-status',
				isSupport: current_PageInfo.isSupport,
				isScriptRun: current_PageInfo.isScriptRun,
				isSearched: current_PageInfo.isSearched,
				isMarkhide: current_PageInfo.isMarkhide
			});
			
			break;
			
		case 'quest-open-sidepanel':
			if (current_SidepageInfo.isVisible && Boolean(msg.targetKeyword)){
				current_SidepageInfo.connectPort.postMessage({
					event_name: 'show-selected-keyword',
					keywordSelected: msg.targetKeyword
				});
			}
			else{
				if (Boolean(msg.targetKeyword)){
					background_Info.currentKeyword = msg.targetKeyword;
				}
				chrome.sidePanel.open({tabId: current_PageInfo.tabId});
			}
			
			break;
			
		case 'quest-keyword-search':
			chrome.tabs.sendMessage(current_PageInfo.tabId, {event_name: 'keyword-mark-search', keyword_keyindex: keyword_KeyIndex}, function (ReturnData){
				if (ReturnData.isFinish){
					updateCurrentPageInfo();
					chrome.action.setBadgeText({tabId: current_PageInfo.tabId, text: `${ReturnData.found}`});
				}
			});
			break;
		case 'quest-keyword-show':
			chrome.tabs.sendMessage(current_PageInfo.tabId, {event_name: 'keyword-mark-show'}, function (ReturnData){
				if (ReturnData.isFinish){
					updateCurrentPageInfo();
				}
			});
			break;
		case 'quest-keyword-hide':
			chrome.tabs.sendMessage(current_PageInfo.tabId, {event_name: 'keyword-mark-hide'}, function (ReturnData){
				if (ReturnData.isFinish){
					updateCurrentPageInfo();
				}
			});
			break;
	}
}

// ====== 初始化 ====== 
async function loadStartupData(){
	if (basic_StartupDataConfirmation == 'unload'){
		basic_StartupDataConfirmation = 'loading';
	
		const KeywordRefreshReturnData = await refreshKeywordKeyIndex();
		const UrlRefreshReturnData = await refreshUrlKeyIndex();
			
		if (KeywordRefreshReturnData.isFinish && UrlRefreshReturnData.isFinish){
			basic_StartupDataConfirmation = 'complete';
			
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
				const currentWindowTab = tabs[0];
				
				if (currentWindowTab !== undefined){
					current_PageInfo.tabId = currentWindowTab.id;
					updateCurrentPageInfo();
				}
			});
			if ((background_Info.currentKeyword == '') && (keyword_KeyIndex.length != 0)){
				
				const DisplayOrderReturnData = await getKeywordDisplayOrder();
				if (DisplayOrderReturnData.isFinish){
					background_Info.currentKeyword = DisplayOrderReturnData.displayOrder[0];
				}
			}
		}
		else{
			basic_StartupDataConfirmation = 'fail';
			//needErrorMessage
		}
	}
}

async function awaitLoadStartupData(){
	await timeout(1000);
	if (basic_StartupDataConfirmation == 'unload'){
		loadStartupData();
	}
}

awaitLoadStartupData();
