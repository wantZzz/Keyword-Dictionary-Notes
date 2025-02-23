var current_PageInfo = {
	isSupport: false,
	isScriptRun: false,
	isSearched: false,
	isMarkhide: false
};

var background_Info = {
	isConnect: false,
	connectPort: null,
	identificationToken: ""
}

// ====== 資料處理 ====== 
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateCurrentPageInfo(){
	const StartupSwitch = document.getElementById("start_up");
	const StartupText = StartupSwitch.querySelector(".keyword_text");
	
	if(current_PageInfo.isSupport){
		if(!current_PageInfo.isScriptRun){
			StartupText.innerText = "Page hasn't been initialized";
			return;
		}
		StartupSwitch.classList.remove("hidden");
		
		if(!current_PageInfo.isSearched){
			StartupSwitch.classList.remove("on");
			StartupText.innerText = "Start up";
		}
		else if(current_PageInfo.isMarkhide){
			StartupSwitch.classList.remove("on");
			StartupText.innerText = "Show mark";
		}
		else{
			StartupSwitch.classList.add("on");
			StartupText.innerText = "Hide mark";
		}
	}
	else{
		StartupSwitch.classList.add("hidden");
		StartupSwitch.classList.remove("on");
		StartupText.innerText = "Page is not supported";
	}
}

async function openSidepanel(targetKeyword = null){
	const QuestData = {
		event_name: 'quest-open-sidepanel',
		targetKeyword: targetKeyword
	}
	
	background_Info.connectPort.postMessage(QuestData);
}

function triggerAlertWindow(message, type){
	const notification = {
		event_name: 'send-notification-message',
		message: message,
		notification_type: type
	};
	
	chrome.runtime.sendMessage(notification, (t) => {});
}

// ====== 元素事件 ====== 
function startupToggleClick(event){
	if (current_PageInfo.isScriptRun){
		if (!current_PageInfo.isSearched){
			background_Info.connectPort.postMessage({event_name: 'quest-keyword-search'});
		}
		else if (current_PageInfo.isMarkhide) {
			background_Info.connectPort.postMessage({event_name: 'quest-keyword-show'});
		} 
		else{
			background_Info.connectPort.postMessage({event_name: 'quest-keyword-hide'});
		}
	}	
}

function newKeywordButtonClick(event){
	const NewKeywordButton = event.target.closest('div.button');
	const popup_bar = NewKeywordButton.closest("#popup_bar");
	const ButtonsDiv = popup_bar.querySelectorAll('div.button');
	NewKeywordButton.classList.toggle("folded_target");
	
	for (const ButtonDiv of ButtonsDiv){
		ButtonDiv.classList.toggle("folded");
	}
}

function newKeywordSubmitButtonClick(event){
	const newkeyword_input = document.getElementById("newkeyword_input");
	const NewKeyword = newkeyword_input.value;
	
	if (NewKeyword != ""){
		openSidepanel(NewKeyword);
		
		const NewKeywordButton = event.target.closest('div.button');
		const popup_bar = NewKeywordButton.closest("#popup_bar");
		const ButtonsDiv = popup_bar.querySelectorAll('div.button');
		NewKeywordButton.classList.toggle("folded_target");
		
		for (const ButtonDiv of ButtonsDiv){
			ButtonDiv.classList.toggle("folded");
		}
	}
	else{
		triggerAlertWindow(chrome.i18n.getMessage('submit_newkeyword_click_warning'), 'warning');
	}
}

function openNotebookClick(event){
	openSidepanel();
}

function popupSettingClick(event){
	window.open(chrome.runtime.getURL('setting_page/setting.html'));
}

function popupResearchClick(event){
	if (!current_PageInfo.isSupport){
		//needErrorMessage
	}
	if (!current_PageInfo.isScriptRun){
		//needErrorMessage
	}
	else if (!current_PageInfo.isSearched){
		triggerAlertWindow(chrome.i18n.getMessage('research_click_warning'), 'warning');
	}
	else{
		chrome.tabs.sendMessage(currentpage_TabId, {event_name: 'keyword-mark-research'}, (t) => {});
	}
}

// ====== 資料接收 ====== 
/*
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse){ //短期連接通訊
	console.log(request.event_name);
	
	switch (request.event_name) {
		
	}
	
	return true;
});
*/

async function createPortToBackground(ms, isStart = false){//建立與背景的長期連接通訊
	background_Info.connectPort = chrome.runtime.connect({name: 'Popup'});
	
	background_Info.connectPort.onMessage.addListener(onMessageFromBackground);
	background_Info.connectPort.onDisconnect.addListener(async () => {
		background_Info.connectPort = null;
		background_Info.isConnect = false;
		
		await timeout(ms);
		createPortToBackground(ms);
	});
	
	if (isStart){
		background_Info.connectPort.postMessage({event_name: 'quest-tab-status'});
		runInitial();
	}
}
function onMessageFromBackground(msg){//長期連接通訊
	background_Info.isConnect = true;
	
	switch (msg.event_name) {
		case 'update-tab-status':
			current_PageInfo = {
				isSupport: msg.isSupport,
				isScriptRun: msg.isScriptRun,
				isSearched: msg.isSearched,
				isMarkhide: msg.isMarkhide
			};
			updateCurrentPageInfo();
			
			break;
	}
	
	console.log(msg.event_name);
}

// ====== 初始化 ====== 
function runInitial(){
	document.querySelectorAll('[data-i18n]').forEach((i18n_element) => {
		const i18n_content = chrome.i18n.getMessage(i18n_element.dataset.i18n);
		const insert_attribute = i18n_element.dataset.i18n.split('__')[1];
		
		if (Boolean(insert_attribute)){
			i18n_element.setAttribute(insert_attribute, i18n_content);
		}
		else{
			i18n_element.innerText = i18n_content;
		}
	});
	
	// 搜尋與顯示標記滑桿
	const startup_Switch_ = document.getElementById("start_up");
	const startup_Toggle = startup_Switch_.querySelector(".switch_toggle");
	startup_Toggle.addEventListener("click", startupToggleClick);
	
	// 開闔新增關鍵字筆記
	const newkeyword_Button = document.getElementById("popup_new_keyword");
	newkeyword_Button.addEventListener("click", newKeywordButtonClick);
	
	// 確認新增關鍵字筆記
	const newkeyword_Submit = document.getElementById("new_keyword_submit");

	newkeyword_Submit.addEventListener("click", newKeywordSubmitButtonClick);	

	document.getElementById("popup-open-notebook").addEventListener("click", openNotebookClick);
	document.getElementById("popup-setting").addEventListener("click", popupSettingClick);
	document.getElementById("popup-research").addEventListener("click", popupResearchClick);
}

createPortToBackground(5000, true);
