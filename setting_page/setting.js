//import {formatNote2GoogleDocs} from "/module/Remit2GoogleDocs.js"; //擱置開發
import {initSubPageIndexs, initSubPageIndexs_info, subpageIndex_setting} from "/module/SubpageIndex.js";

var subpageSetting = null;//new subpageIndex_setting(initindexs_enable, custom_subpageRules)

//通用設定資料
var settings = {
	is_DarkMode: [true, -1],
	is_SwitchWithTab: [true, -1],
	//is_GoogleConnect: [false, ""],
	is_NotebooklmConnect: [false, ""]
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

/*
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
*/

function UpdateAccountNotebooklmInfo(button_disabled = false){
	const account_tab = document.getElementById('account-tab');
	const notebooklm_account_button = account_tab.querySelector('.notebooklm-account-block button.notebooklm-connect-confirm');
	const notebooklm_account_select = account_tab.querySelector('.notebooklm-account-block select.notebooklm-account-select');
	const notebooklm_account_info = account_tab.querySelector('.notebooklm-account-block p.notebooklm-account-info');
	
	if (settings['is_NotebooklmConnect'][0]){
		notebooklm_account_info.innerText = "已與帳號 [" + settings['is_NotebooklmConnect'][1] + "] 建立連接";
	}
	else{
		notebooklm_account_info.innerText = "未選擇 NotebookLM 連接的帳戶";
	}
	
	notebooklm_account_button.disabled = button_disabled;
	notebooklm_account_button.innerText = button_disabled ? notebooklm_account_button.innerText : "與選取帳號連結";
	notebooklm_account_select.disabled = false;
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
		case 2:
			data['ModuleData'] = {
				"SubpageIndex": {
					"initindexs_enable": {
						"www.google.com": true,
						"www.bing.com": true,
						"www.youtube.com": true,
						"www.twitch.tv": true,
						"forum.gamer.com.tw": true,
						"home.gamer.com.tw": true
					},
					"custom_subpageIndexs": {
						"www.pttweb.cc": []
					},
					"custom_subpageRules": {
						"www.pttweb.cc": [{
							"mode": "pathname",
							"enable": true,
							"id": 11111,
							"regex_rule": "(?<specify_index>Military)"
						}]
					}
				}
			};
			data['NoIndexNote'] = [];
			data['note_version'] = 3;
	}
	
	return data;
}

function refrshRulesTable(table){
	let tbody = table.tBodies[0];
	
	function sanitizesString(value){//sorce: https://stackoverflow.com/questions/12799539/javascript-xss-prevention
		const lt = /</g, gt = />/g, ap = /'/g, ic = /"/g;
		value = value.toString().replace(lt, "&lt;").replace(gt, "&gt;").replace(ap, "&#39;").replace(ic, "&#34;");
		
		return value;
	}
	
	function createRuleTR(id, date, host, rule_category, is_enable, is_initsubpage = false){
		let ruletr = document.createElement('tr');
		
		if (is_enable){
			ruletr.classList.add('on');
		}
		
		ruletr.setAttribute('ruleid', id);
		let ruletr_innerhtml = `
			<td><span>${date}</span></td>
			<td><span>${host}</span></td>
			<td><span>${sanitizesString(rule_category)}</span></td>
			<td>
				<div class="switch-toggle">
					<span class="toggle-box"></span>
				</div>
			</td>
		`;
		
		if (is_initsubpage){
			ruletr_innerhtml += "<td></td>"
			ruletr.innerHTML = ruletr_innerhtml;
		}
		else{
			/*
			ruletr_innerhtml += `<td>
									<div class="rule-created-control">
										<i class="svg-24button edit-rule-conditions">
											<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-2 -2 28 28">
												<path fill="currentColor" fill-rule="evenodd" d="M15.586 3a2 2 0 0 1 2.828 0L21 5.586a2 2 0 0 1 0 2.828L19.414 10L14 4.586zm-3 3l-9 9A2 2 0 0 0 3 16.414V19a2 2 0 0 0 2 2h2.586A2 2 0 0 0 9 20.414l9-9z" clip-rule="evenodd" />
											</svg>
										</i>
										<i class="svg-24button delete-rule-conditions">
											<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-2 -2 28 28">
												<path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z" />
											</svg>
										</i>
									</div>
								</td>`;
			*/
			ruletr_innerhtml += `<td>
									<div class="rule-created-control">
										<i class="svg-24button delete-rule-conditions">
											<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-2 -2 28 28">
												<path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z" />
											</svg>
										</i>
									</div>
								</td>`;
			ruletr.innerHTML = ruletr_innerhtml;
			
			//ruletr.querySelector('i.edit-rule-conditions svg').addEventListener('click', rulesEditConditions);
			ruletr.querySelector('i.delete-rule-conditions svg').addEventListener('click', rulesDeleteConditions);
		}
		
		return ruletr;
	}
	
	tbody.innerHTML = `
		<tr ruleid="*">
			<td><strong>建立日期</strong></td>
			<td><strong>應用網域</strong></td>
			<td><strong>規則類別</strong></td>
			<td><strong>規則啟用</strong></td>
			<td></td>
		</tr>
	`;
	const indexs_enable = subpageSetting.getRulesInfo();
	
	let wait_list = []
	for (let i = 0; i < indexs_enable.length; i++){
		const [id, date, host, rule_category, is_enable] = indexs_enable[i];
		
		const is_initsubpage = id.startsWith('@');
		const tr_node = createRuleTR(id, date, host, rule_category, is_enable, is_initsubpage);
		
		if (is_initsubpage){
			tbody.appendChild(tr_node);
		}
		else{
			wait_list.push(tr_node);
		}
	}
	
	while(wait_list.length){
		tbody.appendChild(wait_list.shift());
	}
	
	const rules_switch_toggles = table.querySelectorAll('.switch-toggle span.toggle-box');
	rules_switch_toggles.forEach(function (switch_toggle){
		switch_toggle.addEventListener('click', rulesSwitchOnClick);
	});
	
	const rule_tab = table.closest('div#rule-tab');
	rule_tab.querySelector('div.rules-enable-confirm button').addEventListener('click', rulesEnableConfirmClick);
}

function UpdateAccountNotebooklmOption(data) {
	const account_tab = document.getElementById('account-tab');
	const notebooklm_account_button = account_tab.querySelector('.notebooklm-account-block button.notebooklm-connect-confirm');
    const selectElement = account_tab.querySelector('.notebooklm-account-block .notebooklm-account-select');

    selectElement.innerHTML = '';
	selectElement.removeEventListener('click', getNotebooklmAccountlist);

    const defaultOption = document.createElement('option');
    defaultOption.value = -1;
    defaultOption.textContent = '不連接帳戶';
    selectElement.appendChild(defaultOption);

	let counter = 0;
    data.forEach(email => {
        const option = document.createElement('option');
        option.value = counter;
        option.textContent = email;
        selectElement.appendChild(option);
		
		counter += 1;
    });

	notebooklm_account_button.innerText = "與選取帳號連結";
	notebooklm_account_button.disabled = false;
	
    selectElement.selectedIndex = 0;
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
		triggerAlertWindow(chrome.i18n.getMessage('unregister_setting'), 'error');
	}
}

function rulesSwitchOnClick(event){
	const collapse_content = event.target.closest('tr');
	collapse_content.classList.toggle('on');
}
function dropDownExpand(event){
	//const collapse_list = event.target.closest('ul.collapse-list');
	//const title_bottons = collapse_list.querySelectorAll('li.collapse-content .fold-content');
	
	const collapse_content = event.target.closest('li.collapse-content');
	collapse_content.classList.toggle('expand');
}

function rulesEditConditions(event){
	return;
}
function rulesDeleteConditions(event){
	const ruletr = event.target.closest('tr');
	const rule_id = ruletr.getAttribute('ruleid');
	
	if (subpageSetting.removeRules(rule_id)){
		const rules_created_list = document.getElementById('rules-created-table');
		refrshRulesTable(rules_created_list);
	}
	
	chrome.runtime.sendMessage({event_name: 'send-delete-subpage-rules', rule_id: rule_id}, (t) => {});
}

function rulesEnableConfirmClick(event){
	const tbody = event.target.closest('div#rule-tab').querySelector('tbody');
	let rules_enable = {};
	
	for (let i = 0; i < tbody.children.length; i++){
		const ruletr = tbody.children[i];
		const ruleid = ruletr.getAttribute('ruleid');
		
		if (!Boolean(ruleid)){
			continue;
		}
		else if (ruleid == "*"){
			continue;
		}
		else{
			rules_enable[ruleid] = ruletr.classList.contains('on');
		}
	}
	
	subpageSetting.updateRulesEnable(rules_enable);
	chrome.runtime.sendMessage({event_name: 'update-subpage-rules-enable', rules_enable: rules_enable}, (t) => {});
}

function newSubpagePathnameRule(event){
	const pathnamerule_block = event.target.closest('div#pathnamerule-input');
	const url_input = pathnamerule_block.querySelector('div.domainname-input input').value;
	const regex_input = pathnamerule_block.querySelector('div.regex-input input').value;
	
	const url_val = new URL(url_input);
	const host = url_val.host;
	
	const rule_data = subpageSetting.newPathnameRuleCreate(host, regex_input);
	
	const rules_created_list = document.getElementById('rules-created-table');
	refrshRulesTable(rules_created_list);
	
	chrome.runtime.sendMessage({event_name: 'send-new-subpage-rules', host: host, rule_data: rule_data}, (t) => {});
}
function newSubpageTitleRule(event){
	const titlerule_block = event.target.closest('div#tabnamerule-input');
	const url_input = titlerule_block.querySelector('div.domainname-input input').value;
	const regex_input = titlerule_block.querySelector('div.regex-input input').value;
	
	const url_val = new URL(url_input);
	const host = url_val.host;
	
	subpageSetting.newTitleRuleCreate(host, regex_input);
	
	const rule_data = document.getElementById('rules-created-table');
	refrshRulesTable(rules_created_list);
	
	chrome.runtime.sendMessage({event_name: 'send-new-subpage-rules', host: host, rule_data: rule_data}, (t) => {});
}
function newSubpageParameterRule(event){
	const parameterrule_block = event.target.closest('div#parameterrule-input');
	const url_input = parameterrule_block.querySelector('div.domainname-input input').value;
	
	let parameters_rules = [];
	
	const tbody = parameterrule_block.querySelector('table.url-var-input-table').querySelector('tbody');
	for (let i = 0; i < tbody.children.length; i++){
		const parameter_ruletr = tbody.children[i];
		
		const parameter = parameter_ruletr.querySelector('input[classify="var"]').value;
		const logic = Boolean(parameter_ruletr.querySelector('select[classify="logic"]')) ? parameter_ruletr.querySelector('select[classify="logic"]').value : 'OR';
		const mode = Boolean(parameter_ruletr.querySelector('select[classify="mode"]').value == '1');
		const regex = mode ? parameter_ruletr.querySelector('input[classify="regex"]').value : null;
		
		parameters_rules.push([parameter, logic, mode, regex])
	}
	
	const url_val = new URL(url_input);
	const host = url_val.host;
	
	subpageSetting.newParameterRuleCreate(host, parameters_rules);
	
	const rule_data = document.getElementById('rules-created-table');
	refrshRulesTable(rules_created_list);
	
	chrome.runtime.sendMessage({event_name: 'send-new-subpage-rules', host: host, rule_data: rule_data}, (t) => {});
}

function addUrlRule(event){
	const parameterrulerule_tbody = event.target.closest('tbody');
	const target_ruleindex = event.target.closest('tr').rowIndex;
	
	const parameterrulerule_rows = parameterrulerule_tbody.querySelectorAll('tr');
	
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
	
	if (target_ruleindex == (parameterrulerule_rows.length - 1)){
		parameterrulerule_tbody.appendChild(new_rule);
	}
	else{
		parameterrulerule_tbody.insertBefore(new_rule, parameterrulerule_rows[target_ruleindex + 1])
	}
}
function removeUrlRule(event){
	const parameterrulerule_tbody = event.target.closest('tbody');
	const target_ruleindex = event.target.closest('tr').rowIndex;
	
	const parameterrulerule_rows = parameterrulerule_tbody.querySelectorAll('tr');
	
	if (target_ruleindex < parameterrulerule_rows.length && target_ruleindex >= 0){
		parameterrulerule_tbody.removeChild(parameterrulerule_rows[target_ruleindex]);
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
				triggerAlertWindow(chrome.i18n.getMessage('inport_backupdata_version_too_high'), 'error');
			}
			else{
				chrome.runtime.sendMessage({event_name: 'quest-backupdata-inport', is_overwrite:false, json_data: jsonObj}, (response) => {});
				//console.log(jsonObj);
			}
			
		}catch{
			triggerAlertWindow(chrome.i18n.getMessage('inport_backupdata_wrong_type'), 'error');
		}
	}
	
	if (Boolean(input_backupfile)){
		reader.readAsText(input_backupfile);
	}
	else{
		triggerAlertWindow(chrome.i18n.getMessage('inport_backupdata_no_file'), 'warning');
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
				triggerAlertWindow(chrome.i18n.getMessage('inport_backupdata_version_too_high'), 'error');
			}
			else{
				chrome.runtime.sendMessage({event_name: 'quest-backupdata-inport', is_overwrite:true, json_data: jsonObj}, (response) => {});
				//console.log(jsonObj);
			}
			
		}catch{
			triggerAlertWindow(chrome.i18n.getMessage('inport_backupdata_wrong_type'), 'error');
		}
	}
	
	if (Boolean(input_backupfile)){
		reader.readAsText(input_backupfile);
	}
	else{
		triggerAlertWindow(chrome.i18n.getMessage('inport_backupdata_no_file'), 'warning');
	}
}

/*
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
*/

function getNotebooklmAccountlist(event){
	const notebooklm_block = event.target.closest('.notebooklm-account-block');
	const notebooklm_account_button = notebooklm_block.querySelector('.notebooklm-connect-confirm');
	notebooklm_account_button.innerText = "載入中";
	
	chrome.runtime.sendMessage({event_name: 'quest-account-notebooklm-list'}, (t) => {});
}

function connectNotebooklmAccount(event) {
    const notebooklm_account_button = event.target.closest('button');
    notebooklm_account_button.disabled = true;
	notebooklm_account_button.innerText = "操作中";
	
    const selectElement = document.querySelector('.notebooklm-account-select');
    const account_index = parseInt(selectElement.value);
	
    selectElement.disabled = true;

	chrome.runtime.sendMessage({event_name: 'connect-account-notebooklm', account_index: account_index}, (t) => {});
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
				triggerAlertWindow(chrome.i18n.getMessage('unsaved_setting'), 'error');
			}
			break;
	
		/*
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
		*/
			
		case 'response-backupdata-export':
			sendResponse({});
			exportJsonData(request.backup_data);
			break;
			
		/* //擱置開發
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
		*/
			
		//--- SubpageIndex.js ---
		case 'response-init-subpagesetting':
			sendResponse({});
			
			if (!subpageSetting){
				subpageSetting = new subpageIndex_setting(request.reply_data.initindexs_enable, request.reply_data.custom_subpageRules);
				
				const rules_created_list = document.getElementById('rules-created-table');
				refrshRulesTable(rules_created_list);
			}
			break;
			
		/*
		case 'update-subpage-rules-data':
			sendResponse({});
			
			break;
		*/
		
		//--- notebooklmCaller.js ---
		case 'response-account-notebooklm-list':
			sendResponse({});
			UpdateAccountNotebooklmOption(request.authusers);
			
			break;
			
		case 'response-connect-account-notebooklm':
			sendResponse({});
			chrome.runtime.sendMessage({event_name: 'quest-extension-setting'}, (response) => {
				settings['is_NotebooklmConnect'] = response.is_notebooklmconnect;
				UpdateAccountNotebooklmInfo(false);
			});
	}
});

// ====== 初始化 ====== 
function runInitial(){
	const sidebar_area = document.getElementById('sidebar-area');
	const title_bottons = sidebar_area.querySelectorAll('button.title_botton');
	title_bottons.forEach(function (title_botton){
		title_botton.addEventListener('click', switchCenterPage);
	});
	
	const rules_option_list = document.getElementById('rules-option-list');
	rules_option_list.querySelector('div#pathnamerule-input div.rule-confirm button').addEventListener('click', newSubpagePathnameRule);
	rules_option_list.querySelector('div#parameterrule-input div.rule-confirm button').addEventListener('click', newSubpageParameterRule);
	rules_option_list.querySelector('div#tabnamerule-input div.rule-confirm button').addEventListener('click', newSubpageTitleRule);
	const drop_down_controls = rules_option_list.querySelectorAll('.drop-down-header .drop-down-control svg');
	drop_down_controls.forEach(function (drop_down_control){
		drop_down_control.addEventListener('click', dropDownExpand);
	});
	
	const parameterrule_input = document.getElementById('parameterrule-input');
	const parameterrulerule_rows = parameterrule_input.querySelectorAll('.url-var-input tr');
	
	parameterrulerule_rows[0].querySelector('i.add-rule-conditions svg').addEventListener('click', addUrlRule);
	parameterrulerule_rows[0].querySelector('select[classify="mode"]').addEventListener('change', changeInputDisabled);
	for (let i = 1; i < parameterrulerule_rows.length; i++){
		parameterrulerule_rows[i].querySelector('i.add-rule-conditions svg').addEventListener('click', addUrlRule);
		parameterrulerule_rows[i].querySelector('i.remove-rule-conditions svg').addEventListener('click', removeUrlRule);
		parameterrulerule_rows[i].querySelector('select[classify="mode"]').addEventListener('change', changeInputDisabled);
	};
	
	const account_tab = document.getElementById('account-tab');
	account_tab.querySelector('button.export-jsondata-button').addEventListener('click', exportBackupJsonData);
	account_tab.querySelector('button.initialization-data-button').addEventListener('click', initializationData);
	account_tab.querySelector('button.cover-jsondata-button').addEventListener('click', inportCoverJsonData);
	account_tab.querySelector('button.add-jsondata-button').addEventListener('click', inportADDJsonData);
	
	//--- notebooklmCaller.js ---
	const notebooklm_block = account_tab.querySelector('.notebooklm-account-block');
	notebooklm_block.querySelector('.notebooklm-connect-confirm').addEventListener('click', connectNotebooklmAccount);
	notebooklm_block.querySelector('.notebooklm-account-select').addEventListener('click', getNotebooklmAccountlist);
	
	chrome.runtime.sendMessage({event_name: 'quest-extension-setting'}, (response) => {
		settings['is_DarkMode'][0] = response.is_darkmode;
		settings['is_SwitchWithTab'][0] = response.is_switchwithtab;
		//settings['is_GoogleConnect'] = response.is_googleconnect;
		settings['is_NotebooklmConnect'] = response.is_notebooklmconnect;
		
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
		
		//UpdateAccountGoogleInfo();
		UpdateAccountNotebooklmInfo(true);
	});
	
	//--- SubpageIndex.js ---
	
	chrome.runtime.sendMessage({event_name: 'quest-module-data-read', reply_event_name: 'response-init-subpagesetting', modulename: "SubpageIndex", keys: ['custom_subpageRules', 'initindexs_enable']}, (t) => {});
}

runInitial();
