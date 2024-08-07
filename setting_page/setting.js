//通用設定資料
var settings = {
	is_DarkMode: [true, -1],
	is_SwitchWithTab: [true, -1]
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

// ====== 元素事件 ====== 
function triggerAlertWindow(message, type){
	notification = {
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
	
	chrome.runtime.sendMessage({event_name: 'quest-extension-setting'}, (response) => {
		settings['is_DarkMode'][0] = response.is_darkmode;
		settings['is_SwitchWithTab'][0] = response.is_switchwithtab;
		
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
	});
}

runInitial();
