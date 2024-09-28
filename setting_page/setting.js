import {formatNote2GoogleDocs} from "/module/Remit2GoogleDocs.js";

//通用設定資料
var settings = {
	is_DarkMode: [true, -1],
	is_SwitchWithTab: [true, -1],
	is_GoogleConnect: [false, ""]
}

//資料控制項
var sync_message_timeout = null;

// ====== 資料處理 ======
function UpdateDisplaySwitch(setting_name, value){
	const settings_list = Object.keys(settings);
	
	if (settings_list.includes(setting_name)){
		const display_option_list = document.getElementById('display-option-list');
		const switch_contents = display_option_list.querySelectorAll(':scope > li.switch-content');
		const switch_index = settings[setting_name][1];
		
		settings[setting_name][0] = value;
		
		if (settings[setting_name][0]){
			switch_contents[switch_index].classList.add('on');
		}
		else{
			switch_contents[switch_index].classList.remove('on');
		}
	}
	
	clearTimeout(sync_message_timeout);
	
	const sync_message_container = document.getElementById('display-tab').querySelector('.sync-message-container');
	sync_message_container.classList.remove('display');
	
	setTimeout(() => {
		const sync_message_container = document.getElementById('display-tab').querySelector('.sync-message-container');
		sync_message_container.classList.add('display');
	}, 200);
		
	sync_message_timeout = setTimeout(() => {
		const sync_message_container = document.getElementById('display-tab').querySelector('.sync-message-container');
		sync_message_container.classList.remove('display');
	}, 3200);
}

function UpdateAccountGoogleInfo(){
	const account_tab = document.getElementById('account-tab');
	const google_account_button = account_tab.querySelector('.google-account-block button.account-connect-button');
	const google_account_button_text = google_account_button.querySelector('span');
	const google_account_info = account_tab.querySelector('.google-account-block p.account-info');
	
	if (settings['is_GoogleConnect'][0]){
		google_account_info.innerText = "已登入帳號 [" + settings['is_GoogleConnect'][1] + "] 並同步資料";
		google_account_button_text.innerText = "登出 Google 帳戶";
		google_account_button.addEventListener('click', disconnectGoogleAccount);
	}
	else{
		google_account_info.innerText = "未與 Google 連接帳戶、同步資料";
		google_account_button_text.innerText = "登入 Google 帳戶"
		google_account_button.addEventListener('click', connectGoogleAccount);
	}
	
	google_account_button.disabled = false;
}

function exportJsonData(backup_output){
	const jsonData = JSON.stringify(backup_output);
	const note_version = backup_output['KeywordsSetting']['note_version'];
	
	let currentdate = new Date();
	const datetime = currentdate.getFullYear() + (currentdate.getMonth()+1).toString().padStart(2,'0') + currentdate.getDate().toString().padStart(2,'0');
	
	var a = document.createElement("a");
	var file = new Blob([jsonData], {type: "application/json;charset=utf-8"});
	a.href = URL.createObjectURL(file);
	a.download = `KDN_${datetime}_note${note_version}ver.json`;
	a.click();
}

function noteVersionUpdate(data, note_version){
	switch (note_version) {
		case 0:
			const setting_github_init = {
				version: "v0.1.0-beta.0",
				notify_time: 100
			}
			
			data['github_'] = setting_github_init;
			data['note_version'] = 1;
		case 1:
			data['RecordedUrls'] = {};
			data['note_version'] = 2;
	}
	
	return data;
}
// ====== 元素事件 ====== 
function triggerAlertWindow(message, type){
	const notification = {
		event_name: 'send-notification-message',
		message: message,
		notification_type: type
	};
	
	chrome.runtime.sendMessage(notification, (t) => {});
}

function switchCenterPage(event){
	const center_area = document.getElementById('center-area');
	const open_page_id = event.target.closest('button').getAttribute('open_page');
	const center_pages = center_area.querySelectorAll(':scope > div');
	let is_found = false;
	
	center_pages.forEach(function (center_page){
		if (center_page.id == open_page_id){
			center_page.style.display = "block";
			is_found = true;
		}
		else{
			center_page.style.display = "none";
		}
	});
	
	if (!is_found){
		center_pages[0].style.display = "block";
	}
}

function displaySwitchOnClick(event){
	const collapse_content = event.target.closest('li.switch-content');
	const setting_value = collapse_content.classList.contains('on');
	const setting_name = collapse_content.getAttribute('setting_name');
	const settings_list = Object.keys(settings);
	
	if (settings_list.includes(setting_name)){
		if (settings[setting_name][0] == setting_value){
			const update_setting_change = {
				event_name: 'update-setting-change',
				setting_name: setting_name,
				value: !setting_value
			};
				
			chrome.runtime.sendMessage(update_setting_change, (t) => {});
		}
	}
	else{
		triggerAlertWindow('該設定未被註冊\n建議重新載入頁面再操作', 'error');
	}
}

function rulesSwitchOnClick(event){
	const collapse_content = event.target.closest('tr');
	collapse_content.classList.toggle('on')
}
function dropDownExpand(event){
	//const collapse_list = event.target.closest('ul.collapse-list');
	//const title_bottons = collapse_list.querySelectorAll('li.collapse-content .fold-content');
	
	const collapse_content = event.target.closest('li.collapse-content');
	collapse_content.classList.toggle('expand');
}

function addUrlRule(event){
	const urlrule_tbody = event.target.closest('tbody');
	const target_ruleindex = event.target.closest('tr').rowIndex;
	
	const urlrule_rows = urlrule_tbody.querySelectorAll('tr');
	
	const new_rule = document.createElement('tr');
	
	new_rule.innerHTML = `<td>
                            <select classify="logic">
                              <option>AND</option>
                              <option>OR</option>
                              <option>NAND</option>
                              <option>NOR</option>
                            </select>
                          </td>
                          <td><input type="text" classify="var" placeholder="http://...?[變數名]=***"></td>
                          <td>
                            <select classify="mode">
                              <option value="0">當本變數存在</option>
                              <option value="1">當變數符合...規則時</option>
                            </select>
                          </td>
                          <td><input type="text" classify="regex" placeholder="正規表示式過濾" disabled></td>
                          <td>
                            <i class="svg-24button add-rule-conditions">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z" />
                              </svg>
                            </i>
                          </td>
                          <td>
                            <i class="svg-24button remove-rule-conditions">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M5 13v-2h14v2z" />
                              </svg>
                            </i>
                          </td>`;
						  
	new_rule.querySelector('i.add-rule-conditions svg').addEventListener('click', addUrlRule);
	new_rule.querySelector('i.remove-rule-conditions svg').addEventListener('click', removeUrlRule);
	new_rule.querySelector('select[classify="mode"]').addEventListener('change', changeInputDisabled);
	
	if (target_ruleindex == (urlrule_rows.length - 1)){
		urlrule_tbody.appendChild(new_rule);
	}
	else{
		urlrule_tbody.insertBefore(new_rule, urlrule_rows[target_ruleindex + 1])
	}
}
function removeUrlRule(event){
	const urlrule_tbody = event.target.closest('tbody');
	const target_ruleindex = event.target.closest('tr').rowIndex;
	
	const urlrule_rows = urlrule_tbody.querySelectorAll('tr');
	
	if (target_ruleindex < urlrule_rows.length && target_ruleindex >= 0){
		urlrule_tbody.removeChild(urlrule_rows[target_ruleindex]);
	}
}

function changeInputDisabled(event){
	const rule_row = event.target.closest('tr');
	const rule_modeselect = event.target.closest('select').value;
	const rule_regexinput = rule_row.querySelector('input[classify="regex"]');
	
	if (rule_modeselect == 1){
		rule_regexinput.disabled = false;
	}
	else{
		rule_regexinput.disabled = true;
	}
}

function exportBackupJsonData(event){
	chrome.runtime.sendMessage({event_name: 'quest-backupdata-export'}, (response) => {});
}

function initializationData(event){
	chrome.runtime.sendMessage({event_name: 'quest-initialization-data'}, (response) => {});
}

function inportADDJsonData(event){
	var reader = new FileReader();
	const input_backupfile = document.getElementById("input_backupfile").files[0];
	
	reader.onload = function(event) {
		try{
			var jsonObj = JSON.parse(event.target.result);
			if (jsonObj['KeywordsSetting']['note_version'] < 2){
				jsonObj = noteVersionUpdate(jsonObj, jsonObj['KeywordsSetting']['note_version'])
			}
			
			if (jsonObj['KeywordsSetting']['note_version'] > 2){
				triggerAlertWindow('該備份資料版本高於當前版本，無法匯入', 'error');
			}
			else{
				chrome.runtime.sendMessage({event_name: 'quest-backupdata-inport', is_overwrite:false, json_data: jsonObj}, (response) => {});
				//console.log(jsonObj);
			}
			
		}catch{
			triggerAlertWindow('錯誤檔案類型', 'error');
		}
	}
	
	if (Boolean(input_backupfile)){
		reader.readAsText(input_backupfile);
	}
	else{
		triggerAlertWindow('未選取檔案', 'warning');
	}
}

function inportCoverJsonData(event){
	var reader = new FileReader();
	const input_backupfile = document.getElementById("input_backupfile").files[0];
	
	reader.onload = function(event) {
		try{
			var jsonObj = JSON.parse(event.target.result);
			if (jsonObj['KeywordsSetting']['note_version'] < 2){
				jsonObj = noteVersionUpdate(jsonObj, jsonObj['KeywordsSetting']['note_version'])
			}
			
			if (jsonObj['KeywordsSetting']['note_version'] > 2){
				triggerAlertWindow('該備份資料版本高於當前版本，無法匯入', 'error');
			}
			else{
				chrome.runtime.sendMessage({event_name: 'quest-backupdata-inport', is_overwrite:true, json_data: jsonObj}, (response) => {});
				//console.log(jsonObj);
			}
			
		}catch{
			triggerAlertWindow('錯誤檔案類型', 'error');
		}
	}
	
	if (Boolean(input_backupfile)){
		reader.readAsText(input_backupfile);
	}
	else{
		triggerAlertWindow('未選取檔案', 'warning');
	}
}

function connectGoogleAccount(event){
	const google_account_button = event.target.closest('button');
	google_account_button.querySelector('span').innerText = "處理中...";
	google_account_button.disabled = true;
	
	chrome.runtime.sendMessage({event_name: 'connect-account-google'}, (t) => {});
	google_account_button.removeEventListener('click', connectGoogleAccount);
}

function disconnectGoogleAccount(event){
	const google_account_button = event.target.closest('button');
	google_account_button.querySelector('span').innerText = "處理中...";
	google_account_button.disabled = true;
	
	chrome.runtime.sendMessage({event_name: 'disconnect-account-google'}, (t) => {});
	google_account_button.removeEventListener('click', disconnectGoogleAccount);
}

// ====== 資料接收 ====== 
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse){
	switch (request.event_name) {
		//儲存資料回傳
		case 'response-setting-change':
			sendResponse({});
			
			if (request.process_state){
				UpdateDisplaySwitch(request.setting_name, request.value);
			}
			else{
				triggerAlertWindow('該設定更新失敗', 'error');
			}
			break;
	
		case 'response-check-account-google'://備用
			sendResponse({});
			break;
			
		case 'response-connect-account-google':
			sendResponse({});
			chrome.runtime.sendMessage({event_name: 'quest-extension-setting'}, (response) => {
				settings['is_GoogleConnect'] = response.is_googleconnect;
				UpdateAccountGoogleInfo();
			});
			break;
		case 'response-disconnect-account-google':
			sendResponse({});
			chrome.runtime.sendMessage({event_name: 'quest-extension-setting'}, (response) => {
				settings['is_GoogleConnect'] = response.is_googleconnect;
				UpdateAccountGoogleInfo();
			});
			break;
			
		case 'response-backupdata-export':
			sendResponse({});
			exportJsonData(request.backup_data);
			break;
			
		case 'format-note2googledocs':
			formatNote2GoogleDocs(request.tag_name, request.note_data, (output_requests, output_await_requests, process_state) => {
				const response_note2_googledocs = {
					event_name: 'response-format-note2googledocs',
					tag_name: request.tag_name,
					process_state: process_state,
					output_requests: output_requests,
					output_await_requests: output_await_requests
				};
				console.log(output_requests, process_state);
				
				chrome.runtime.sendMessage(response_note2_googledocs, () => {})
			});
			break;
	}
});

// ====== 初始化 ====== 
function runInitial(){
	const sidebar_area = document.getElementById('sidebar-area');
	const title_bottons = sidebar_area.querySelectorAll('button.title_botton');
	title_bottons.forEach(function (title_botton){
		title_botton.addEventListener('click', switchCenterPage);
	});
	
	const rules_created_list = document.getElementById('rules-created-table');
	const rules_switch_toggles = rules_created_list.querySelectorAll('.switch-toggle span.toggle-box');
	rules_switch_toggles.forEach(function (switch_toggle){
		switch_toggle.addEventListener('click', rulesSwitchOnClick);
	});
	
	const rules_option_list = document.getElementById('rules-option-list');
	const drop_down_controls = rules_option_list.querySelectorAll('.drop-down-header .drop-down-control svg');
	drop_down_controls.forEach(function (drop_down_control){
		drop_down_control.addEventListener('click', dropDownExpand);
	});
	
	const urlrule_input = document.getElementById('urlrule-input');
	const urlrule_rows = urlrule_input.querySelectorAll('.url-var-input tr');
	
	urlrule_rows[0].querySelector('i.add-rule-conditions svg').addEventListener('click', addUrlRule);
	urlrule_rows[0].querySelector('select[classify="mode"]').addEventListener('change', changeInputDisabled);
	for (let i = 1; i < urlrule_rows.length; i++){
		urlrule_rows[i].querySelector('i.add-rule-conditions svg').addEventListener('click', addUrlRule);
		urlrule_rows[i].querySelector('i.remove-rule-conditions svg').addEventListener('click', removeUrlRule);
		urlrule_rows[i].querySelector('select[classify="mode"]').addEventListener('change', changeInputDisabled);
	};
	
	const account_tab = document.getElementById('account-tab');
	account_tab.querySelector('button.export-jsondata-button').addEventListener('click', exportBackupJsonData);
	account_tab.querySelector('button.initialization-data-button').addEventListener('click', initializationData);
	account_tab.querySelector('button.cover-jsondata-button').addEventListener('click', inportCoverJsonData);
	account_tab.querySelector('button.add-jsondata-button').addEventListener('click', inportADDJsonData);
	
	chrome.runtime.sendMessage({event_name: 'quest-extension-setting'}, (response) => {
		settings['is_DarkMode'][0] = response.is_darkmode;
		settings['is_SwitchWithTab'][0] = response.is_switchwithtab;
		settings['is_GoogleConnect'] = response.is_googleconnect;
		
		const display_option_list = document.getElementById('display-option-list');
		const displays_switch_toggles = display_option_list.querySelectorAll('.switch-toggle span.toggle-box');
		const settings_list = Object.keys(settings);
		
		let conuter = 0;
		displays_switch_toggles.forEach(function (switch_toggle){
			switch_toggle.addEventListener('click', displaySwitchOnClick);
			const setting_name = switch_toggle.closest('li.switch-content').getAttribute('setting_name');
			
			if (settings_list.includes(setting_name)){
				if (settings[setting_name][0]){
					switch_toggle.closest('li.switch-content').classList.add('on');
				}
				else{
					switch_toggle.closest('li.switch-content').classList.remove('on');
				}
				
				settings[setting_name][1] = conuter;
				conuter += 1;
			}
			else{
				switch_toggle.closest('li.switch-content').remove();
			}
		});
		
		UpdateAccountGoogleInfo();
	});
}

runInitial();
