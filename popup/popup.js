//外部腳本資料
var currentpage_TabId = null;
var is_NewKeywordFolded = false;
//通用設定資料
var is_DarkMode = true;

//編輯器控制項
var is_EditorLoad = false;
var editing_Editor = null;
const language_Code = chrome.i18n.getUILanguage();

// ====== 資料處理 ====== 
function currentPagePageStatusUpdate(is_support, is_script_run, page_status){
	const startup_Switch = document.getElementById("start-up");
	const startup_Text = startup_Switch.querySelector(".keyword-text");
	
	if(is_support){
		if(!is_script_run){
			startup_Text.innerText = "Page hasn't been initialized";
			return;
		}
		startup_Switch.classList.remove("hidden");
		
		if(!page_status.is_areadysearch){
			startup_Switch.classList.remove("on");
			startup_Text.innerText = "Start up";
		}
		else if(page_status.is_markhide){
			startup_Switch.classList.remove("on");
			startup_Text.innerText = "Show mark";
		}
		else{
			startup_Switch.classList.add("on");
			startup_Text.innerText = "Hide mark";
		}
	}
	else{
		startup_Switch.classList.add("hidden");
		startup_Switch.classList.remove("on");
		startup_Text.innerText = "Page is not supported";
	}
}

function sendNewKeywordquest(newkeyword){
	chrome.runtime.sendMessage({event_name: 'quest-sidePanel-on'}, (response) => {
		const notecontent = Boolean(editing_Editor) ? editing_Editor.getData() : "";
		
		const keyword_note_add = {
			event_name: 'send-keyword-note-add',
			keyword: newkeyword,
			notecontent: notecontent
		};
		chrome.runtime.sendMessage(keyword_note_add, (t) => {});
		
		if (!response.is_sidepanelon){
			chrome.runtime.sendMessage({event_name: 'quest-open-sidePanel', select_keyword: newkeyword}, (response) => {
				if (response.is_allow){
					chrome.sidePanel.open({tabId: currentpage_TabId});
				}
			});
		}
		else{
			chrome.runtime.sendMessage({event_name: 'quest-keyword-notedata-sidepanel', keyword: newkeyword}, (r) => {});
		}
	});
}

// ====== 元素事件 ====== 
function triggerAlertWindow(message, type){
	notification = {
		event_name: 'send-notification-message',
		message: message,
		notification_type: type
	};
	
	chrome.runtime.sendMessage(notification, (t) => {});
}

function startup_toggle_click(event){
	const startup_Switch = document.getElementById("start-up");
	const startup_Text = startup_Switch.querySelector(".keyword-text");
	
	startup_Switch.classList.toggle("on");
	
	if (startup_Text.innerText === "Start up"){
		chrome.tabs.sendMessage(currentpage_TabId, {event_name: 'keyword-mark-search', from: 'popup'}, (t) => {});
	}
	else if (startup_Switch.classList.contains("on")) {
		chrome.tabs.sendMessage(currentpage_TabId, {event_name: 'keyword-mark-show', from: 'popup'}, (t) => {});
	} 
	else{
		chrome.tabs.sendMessage(currentpage_TabId, {event_name: 'keyword-mark-hide', from: 'popup'}, (t) => {});
	}
}

function newkeyword_button_click(event){
	const popup_bar = document.getElementById("popup-bar");
	const buttons_div = popup_bar.querySelectorAll('div.button');
	this.parentNode.classList.toggle("folded-target");
	
	for (const button_div of buttons_div){
		button_div.classList.toggle("folded");
	}
	
	if (!is_EditorLoad){
		BalloonEditor.create(document.getElementById('note_content_editor'), {
				placeholder: 'Enter new note here',
				language: language_Code
			})
			.then( editor => {
				editing_Editor = editor;
			} )
			.catch( error => {
				console.error( error );
			} );
		
		is_EditorLoad = true;
	}
}

function newkeyword_submit_button_click(event){
	const newkeyword_Input = document.getElementById("newkeyword_input");
	const newkeyword = newkeyword_Input.value;
	
	if (newkeyword != ""){
		sendNewKeywordquest(newkeyword);
		
		const popup_bar = document.getElementById("popup-bar");
		const buttons_div = popup_bar.querySelectorAll('div.button');
		newkeyword_Button.parentNode.classList.toggle("folded-target");
		
		for (const button_div of buttons_div){
			button_div.classList.toggle("folded");
		}
		
		newkeyword_Input.value = "";
		if (Boolean(editing_Editor)){
			editing_Editor.setData("");
		}
	}
	else{
		triggerAlertWindow(chrome.i18n.getMessage('submit_newkeyword_click_warning'), 'warning');
	}
}

function open_notebook_click(event){
	chrome.runtime.sendMessage({event_name: 'quest-sidePanel-on'}, (response) => {
		if (!response.is_sidepanelon){
			chrome.runtime.sendMessage({event_name: 'quest-open-sidePanel', select_keyword: null}, (response) => {
				if (response.is_allow){
					chrome.sidePanel.open({tabId: currentpage_TabId});
				}
			});
		}
	});
}

function popup_setting_click(event){
	window.open(chrome.runtime.getURL('setting_page/setting.html'));
}

function popup_research_click(event){
	const startup_Switch = document.getElementById("start-up");
	const startup_Text = startup_Switch.querySelector(".keyword-text");
	
	if (startup_Text.innerText === "Start up"){
		triggerAlertWindow(chrome.i18n.getMessage('research_click_warning'), 'warning');
	}
	else{
		chrome.tabs.sendMessage(currentpage_TabId, {event_name: 'keyword-mark-research'}, (t) => {});
	}
}
// ====== 資料接收 ====== 
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	switch (request.event_name) {
		case 'response-current-tab-popup':
			sendResponse({});
			
			const current_tab_info = request.current_tab_info;
			currentpage_TabId = request.tab_id;
			
			currentPagePageStatusUpdate(current_tab_info.is_support, current_tab_info.is_script_run, current_tab_info.page_status);
			break;
			
		case 'response-keyword-mark-search':
			if (request.request_from == 'popup'){
				sendResponse({});
			}
			
			currentPagePageStatusUpdate(true, true, request.page_status);
			break;
			
		case 'response-keyword-mark-show':
			sendResponse({});
		
			currentPagePageStatusUpdate(true, true, request.page_status);
			break;
			
		case 'response-keyword-mark-hide':
			sendResponse({});
			
			currentPagePageStatusUpdate(true, true, request.page_status);
			break;
	}
});

// ====== 初始化 ====== 
function importCKeditorLanguageFile(){
	const can_inportLanguage = ['en', 'ja']
	
	if (can_inportLanguage.includes(language_Code)){
		import(`../ckeditor5-41.2.0/build/translations/${language_Code}.js`)
		.then((module) => {
			console.log(`*-> ckeditor5 language: [${language_Code}] import sucess`);
		})
		.catch(error => {
			console.log(`*-> ckeditor5 language: [${language_Code}] import fail`);
		});
	}
	else if (can_inportLanguage.includes(language_Code.split('-')[0])){
		import(`../ckeditor5-41.2.0/build/translations/${language_Code.split('-')[0]}.js`)
		.then((module) => {
			console.log(`*-> ckeditor5 language: [${language_Code.split('-')[0]}] import sucess`);
		})
		.catch(error => {
			console.log(`*-> ckeditor5 language: [${language_Code.split('-')[0]}] import fail`);
		});
	}
}

function runSetting(){
	const body = document.body;
	
	if (is_DarkMode){
		body.classList.add('dark');
	}
	else{
		body.classList.remove('dark');
	}
}

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
	const startup_Switch_ = document.getElementById("start-up");
	const startup_Toggle = startup_Switch_.querySelector(".switch-toggle");

	chrome.runtime.sendMessage({event_name: 'quest-current-tab-popup'}, (t) => {});

	startup_Toggle.addEventListener("click", startup_toggle_click);
	
	// 開闔新增關鍵字筆記
	const newkeyword_Button = document.getElementById("popup-new-keyword");

	newkeyword_Button.addEventListener("click", newkeyword_button_click);
	
	// 確認新增關鍵字筆記
	const newkeyword_Submit = document.getElementById("new-keyword-submit");

	newkeyword_Submit.addEventListener("click", newkeyword_submit_button_click);	

	document.getElementById("popup-open-notebook").addEventListener("click", open_notebook_click);
	document.getElementById("popup-setting").addEventListener("click", popup_setting_click);
	document.getElementById("popup-research").addEventListener("click", popup_research_click);
	
	// 請求設定資料
	chrome.runtime.sendMessage({event_name: 'quest-extension-setting'}, (response) => {
		is_DarkMode = response.is_darkmode;
		runSetting();
	});
}

importCKeditorLanguageFile();
runInitial();
